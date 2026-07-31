// Minimal Supabase migration/query runner. Reads SUPABASE_DB_URL from .env.
//
// The Supabase *direct* host (db.<ref>.supabase.co) is IPv6-only and often won't
// resolve, so we connect through the IPv4 session pooler using the same ref +
// password. Region is discovered once (us-west-1 for this project); change POOLER
// below if the project moves.
//
// Usage:
//   node scripts/db.mjs info
//   node scripts/db.mjs sql supabase/migrations/0003_whatever.sql
//   node scripts/db.mjs query "select count(*) from public.crm_records"
import fs from "node:fs";
import pg from "pg";

const POOLER_HOST = "aws-0-us-west-1.pooler.supabase.com";

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

async function main() {
  await client.connect();
  const cmd = process.argv[2] || "info";
  if (cmd === "info") {
    const v = await client.query("select version()");
    console.log("CONNECTED:", v.rows[0].version.split(" on ")[0]);
    const t = await client.query("select table_name from information_schema.tables where table_schema='public' order by table_name");
    console.log("TABLES:", t.rows.map((r) => r.table_name).join(", ") || "(none)");
  } else if (cmd === "sql") {
    await client.query(fs.readFileSync(process.argv[3], "utf8"));
    console.log("APPLIED:", process.argv[3]);
  } else if (cmd === "query") {
    const r = await client.query(process.argv[3]);
    console.log(JSON.stringify(r.rows, null, 2));
  } else {
    console.error("unknown command:", cmd);
    process.exit(2);
  }
}

main()
  .then(() => client.end())
  .catch((e) => {
    console.error("DB ERROR:", e.message);
    process.exit(1);
  });
