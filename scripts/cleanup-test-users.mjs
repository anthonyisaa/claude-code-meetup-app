#!/usr/bin/env node
/**
 * Script to find and remove test users from Supabase.
 *
 * Usage:
 *   node scripts/cleanup-test-users.mjs --list          # List all users
 *   node scripts/cleanup-test-users.mjs --delete        # Delete test/[test] users
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) env[key.trim()] = rest.join("=").trim();
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const mode = process.argv[2] || "--list";

async function listUsers() {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, name, email, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching profiles:", error.message);
    process.exit(1);
  }

  console.log(`\nFound ${profiles.length} total profiles:\n`);
  console.log("ID".padEnd(38) + "Name".padEnd(30) + "Email".padEnd(40) + "Created");
  console.log("-".repeat(140));

  for (const p of profiles) {
    const isTest =
      /test/i.test(p.name) || /\[test\]/i.test(p.name);
    const marker = isTest ? " ← TEST" : "";
    console.log(
      p.id.padEnd(38) +
        (p.name || "").padEnd(30) +
        (p.email || "").padEnd(40) +
        (p.created_at || "") +
        marker
    );
  }

  const testUsers = profiles.filter(
    (p) => /test/i.test(p.name) || /\[test\]/i.test(p.name)
  );
  console.log(`\n${testUsers.length} test user(s) detected (name contains "test").\n`);
}

async function deleteTestUsers() {
  // 1. Find test users (name contains "test") + any specific IDs you want to remove
  const extraIds = [
    // Add UUIDs here if you want to delete specific non-test users, e.g.:
    // "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  ];
  let query = supabase.from("profiles").select("id, name, email");
  if (extraIds.length > 0) {
    query = query.or(`name.ilike.%test%,id.in.(${extraIds.join(",")})`);
  } else {
    query = query.ilike("name", "%test%");
  }
  const { data: profiles, error } = await query;

  if (error) {
    console.error("Error fetching profiles:", error.message);
    process.exit(1);
  }

  if (profiles.length === 0) {
    console.log("No test users found. Nothing to delete.");
    return;
  }

  console.log(`\nFound ${profiles.length} test user(s) to delete:\n`);
  for (const p of profiles) {
    console.log(`  - ${p.name} (${p.email}) [${p.id}]`);
  }

  for (const profile of profiles) {
    const uid = profile.id;
    console.log(`\nDeleting user: ${profile.name} (${uid})...`);

    // 2. Delete avatar from storage
    const { data: files } = await supabase.storage
      .from("avatars")
      .list(uid);

    if (files && files.length > 0) {
      const filePaths = files.map((f) => `${uid}/${f.name}`);
      const { error: storageErr } = await supabase.storage
        .from("avatars")
        .remove(filePaths);
      if (storageErr) {
        console.warn(`  ⚠ Storage cleanup failed: ${storageErr.message}`);
      } else {
        console.log(`  ✓ Deleted ${filePaths.length} avatar file(s)`);
      }
    } else {
      console.log("  - No avatar files found");
    }

    // 3. Delete profile (cascades to matches, waves, connections, beacon_pings)
    const { error: profileErr } = await supabase
      .from("profiles")
      .delete()
      .eq("id", uid);

    if (profileErr) {
      console.error(`  ✗ Profile delete failed: ${profileErr.message}`);
    } else {
      console.log("  ✓ Profile deleted (cascaded to matches, waves, connections, beacon_pings)");
    }

    // 4. Delete the auth user
    const { error: authErr } = await supabase.auth.admin.deleteUser(uid);
    if (authErr) {
      console.error(`  ✗ Auth user delete failed: ${authErr.message}`);
    } else {
      console.log("  ✓ Auth user deleted");
    }
  }

  console.log("\nCleanup complete!");
}

if (mode === "--list") {
  await listUsers();
} else if (mode === "--delete") {
  await deleteTestUsers();
} else {
  console.log("Usage:");
  console.log("  node scripts/cleanup-test-users.mjs --list     # List all users");
  console.log("  node scripts/cleanup-test-users.mjs --delete   # Delete test users");
}
