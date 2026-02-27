#!/usr/bin/env node
/**
 * Applies the avatars storage bucket + RLS policies to your Supabase project.
 * Run once: node scripts/apply-storage-policies.mjs
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (no dotenv dependency needed)
const envPath = resolve(__dirname, "../.env.local");
let envVars = {};
try {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    envVars[key] = val;
  }
} catch {
  console.error("Could not read .env.local — make sure it exists.");
  process.exit(1);
}

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const sql = readFileSync(
  resolve(__dirname, "../supabase/migrations/20260227_avatars_storage_policies.sql"),
  "utf8"
);

// Split on semicolons, run each statement individually
const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

console.log(`Applying ${statements.length} SQL statements to ${SUPABASE_URL}...\n`);

for (const statement of statements) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql: statement }),
  });

  if (!res.ok) {
    // exec_sql RPC might not exist — fall back to the pg endpoint
    const pgRes = await fetch(`${SUPABASE_URL}/pg`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: statement }),
    });

    if (!pgRes.ok) {
      const text = await pgRes.text();
      console.error(`FAILED:\n${statement}\n\nError: ${text}\n`);
      console.log(
        "\nFallback: run the SQL manually in the Supabase Dashboard SQL editor:"
      );
      console.log(
        "  https://supabase.com/dashboard/project/_/sql/new\n"
      );
      console.log("File: supabase/migrations/20260227_avatars_storage_policies.sql\n");
      process.exit(1);
    }
    console.log(`OK: ${statement.slice(0, 60)}...`);
  } else {
    console.log(`OK: ${statement.slice(0, 60)}...`);
  }
}

console.log("\nAll policies applied successfully.");
