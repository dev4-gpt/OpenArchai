// One-off runner: applies a SQL migration file to the Supabase Postgres instance
// using POSTGRES_URL_NON_POOLING from .env.local (DDL should not go through the pooler).
import { readFileSync } from "node:fs";
import pg from "pg";
const { Client } = pg;

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-migration.mjs <path-to-sql-file>");
  process.exit(1);
}

const connectionString = process.env.POSTGRES_URL_NON_POOLING;
if (!connectionString) {
  console.error("POSTGRES_URL_NON_POOLING is not set");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
// pg's ConnectionParameters re-parses `connectionString` and merges it in
// *after* any explicit `ssl` option, so an explicit `ssl` object here would
// silently be overwritten by the string's own sslmode=require. Swapping in
// sslmode=no-verify keeps the connection encrypted but skips strict chain
// verification against Supabase's pooler cert, via pg's own supported path.
const noVerifyConnectionString = connectionString.replace(
  /sslmode=require/,
  "sslmode=no-verify",
);
const client = new Client({ connectionString: noVerifyConnectionString });

try {
  await client.connect();
  await client.query(sql);
  console.log(`Applied ${file}`);
} finally {
  await client.end();
}
