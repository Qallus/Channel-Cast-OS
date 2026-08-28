// Moves the 7 templates out of the crm_records `comm_templates` JSONB store and
// into the email_templates table, so the builder, the send composer and the
// Pipeline picker all read one library.
//
// SMS/push/in-app templates stay where they are — this table is email only.
// Idempotent: matches on name, updates rather than duplicating. Dry-run default.
//
//   node scripts/migrate-email-templates.mjs           # report
//   node scripts/migrate-email-templates.mjs --apply   # write
import fs from "node:fs";
import pg from "pg";

const APPLY = process.argv.includes("--apply");
const POOLER_HOST = "aws-0-us-west-1.pooler.supabase.com";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }),
);
const direct = new URL(env.SUPABASE_DB_URL);
const client = new pg.Client({
  host: POOLER_HOST, port: 5432, user: `postgres.${direct.hostname.split(".")[1]}`,
  password: decodeURIComponent(direct.password), database: "postgres", ssl: { rejectUnauthorized: false },
});

const escapeHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Wrap a plain-text body in the Channel Cast email shell. */
function wrap(body) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0;background:#f1f5ea">
  <tr><td align="center" style="padding:26px 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #dde5d3;border-radius:14px;overflow:hidden">
      <tr><td style="background:#14241a;padding:16px 26px">
        <span style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:2px">CHANNEL CAST</span>
      </td></tr>
      <tr><td style="padding:24px">
        <div style="color:#14241a;font-size:16px;line-height:1.6;white-space:pre-wrap">${escapeHtml(body)}</div>
      </td></tr>
      <tr><td style="padding:0 24px 24px;text-align:center">
        <div style="color:#8a998a;font-size:12px">Channel Cast · Scottsdale, AZ</div>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

await client.connect();
try {
  const { rows } = await client.query("select data from crm_records where collection = 'comm_templates'");
  const all = rows.map((r) => r.data);
  const emails = all.filter((t) => t.channel === "email");
  const skipped = all.filter((t) => t.channel !== "email");

  console.log(`${all.length} templates in comm_templates — ${emails.length} email, ${skipped.length} other channels (left in place)\n`);

  let created = 0, updated = 0;
  for (const t of emails) {
    const existing = await client.query("select id from email_templates where name = $1 limit 1", [t.name]);
    const row = [
      t.name,
      t.subject ?? "",
      t.category ?? "General",
      // comm_templates used active/draft/archived already.
      ["draft", "active", "archived"].includes(t.status) ? t.status : "draft",
      wrap(t.body ?? ""),
      t.body ?? "",
      t.owner ?? null,
      Number(t.sends ?? 0) || 0,
      t.lastSent ? new Date(t.lastSent).toISOString() : null,
    ];

    if (existing.rows.length) {
      updated++;
      console.log(`  update ${t.name}`);
      if (APPLY) {
        await client.query(
          `update email_templates set subject=$2, category=$3, status=$4, html_body=$5, text_body=$6,
             owner=$7, sends=$8, last_sent_at=$9, updated_at=now() where name=$1`,
          row,
        );
      }
    } else {
      created++;
      console.log(`  create ${t.name.padEnd(26)} ${String(t.category ?? "General").padEnd(12)} ${t.status}`);
      if (APPLY) {
        await client.query(
          `insert into email_templates (name, subject, category, status, html_body, text_body, owner, sends, last_sent_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          row,
        );
      }
    }
  }

  for (const t of skipped) console.log(`  skip   ${t.name.padEnd(26)} (${t.channel})`);

  console.log(`\n${created} created, ${updated} updated.`);
  console.log(APPLY ? "APPLIED." : "Dry run — nothing written. Re-run with --apply.");
} finally {
  await client.end();
}
