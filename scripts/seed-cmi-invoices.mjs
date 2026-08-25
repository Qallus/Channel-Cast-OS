// Restores the Constructed Matter / Qallus, LLC invoice set into Supabase.
//
// These are real client invoices, not demo data, so they deliberately live
// outside `seedInvoices` in lib/ops/invoices.ts (which only fires when the
// `invoices` collection is empty and would otherwise mix them into the Channel
// Cast sample records). The source of truth is the JSON alongside the original
// CSV/PDF exports; this script upserts it so a database reset can't lose them.
//
// Billing arrangement: flat $3,000/month retainer. Every development step for a
// month is an `included` line ($0, renders as "Included"); a single priced
// "<Month> - CMI Services" line carries the $3,000.
//
// Usage:
//   node scripts/seed-cmi-invoices.mjs           # upsert all 7
//   node scripts/seed-cmi-invoices.mjs --check   # verify only, no writes
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const POOLER_HOST = "aws-0-us-west-1.pooler.supabase.com";
const SOURCE = "docs/invoices/client-invoices/constructed-matter/cmi-invoices.json";
const MONTHLY_FEE = 3000;

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }),
);
if (!env.SUPABASE_DB_URL) {
  console.error("SUPABASE_DB_URL not found in .env");
  process.exit(2);
}

// The source JSON holds client PII and billing amounts, so it is gitignored and
// won't be present in a fresh clone of this (public) repo — keep it in a private
// backup and drop it back at the path above before running.
if (!fs.existsSync(path.resolve(SOURCE))) {
  console.error(`Missing ${SOURCE} — it is gitignored (client PII). Restore it from a private backup first.`);
  process.exit(2);
}
const invoices = JSON.parse(fs.readFileSync(path.resolve(SOURCE), "utf8"));

// Guard: every invoice must total exactly the flat monthly fee.
const bad = invoices.filter((inv) => {
  const lines = (inv.lineItems ?? []).reduce((s, li) => s + (li.included ? 0 : (li.qty || 0) * (li.rate || 0)), 0);
  const total = lines + lines * ((inv.taxRate || 0) / 100) - (inv.discount || 0);
  return inv.amount !== MONTHLY_FEE || total !== MONTHLY_FEE;
});
if (bad.length) {
  console.error(`Refusing to seed — these are not $${MONTHLY_FEE}: ${bad.map((i) => i.number).join(", ")}`);
  process.exit(1);
}
console.log(`OK: ${invoices.length} invoices, all $${MONTHLY_FEE.toLocaleString()} — ${invoices.map((i) => i.number).join(", ")}`);
if (process.argv.includes("--check")) process.exit(0);

const direct = new URL(env.SUPABASE_DB_URL);
const ref = direct.hostname.split(".")[1];
const client = new pg.Client({
  host: POOLER_HOST,
  port: 5432,
  user: `postgres.${ref}`,
  password: decodeURIComponent(direct.password),
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  for (const inv of invoices) {
    await client.query(
      `insert into crm_records (collection, id, data, updated_at)
       values ('invoices', $1, $2::jsonb, now())
       on conflict (collection, id) do update set data = excluded.data, updated_at = now()`,
      [inv.id, JSON.stringify(inv)],
    );
    console.log(`  upserted ${inv.number}  ${inv.status.padEnd(8)} due ${inv.dueDate}`);
  }
  console.log(`Done — ${invoices.length} invoices seeded.`);
} finally {
  await client.end();
}
