/**
 * Seed demo users: 1 Super Admin, 2 Admins, and 3 Managers (one per branch).
 *
 * This uses the Supabase Admin API (service role key), so it must be run
 * from a trusted machine (your laptop / CI) — never in the browser.
 *
 * Usage:
 *   npm run seed:users
 *
 * Requires .env.local to have:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Safe to re-run — existing users (matched by email) are left alone, and
 * their profile role/branch is re-synced in case it drifted.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "\n✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local\n"
  );
  process.exit(1);
}

console.log(`   → Using SUPABASE_URL: ${SUPABASE_URL}`);
console.log(`   → SERVICE_ROLE_KEY starts with: ${SERVICE_ROLE_KEY?.slice(0, 12)}... (length ${SERVICE_ROLE_KEY?.length})`);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Default demo password for every seeded account — change these after first
// login (Profile page → Change Password), or override per-account below.
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || "FoggyNook@123";

// Branch codes must match what's seeded in supabase/schema.sql
const USERS = [
  {
    full_name: "Ahsan Raza",
    email: "superadmin@foggynook.pk",
    password: DEFAULT_PASSWORD,
    role: "super_admin",
    branch_code: null,
  },
  {
    full_name: "Bilal Ahmed",
    email: "admin.vehari@foggynook.pk",
    password: DEFAULT_PASSWORD,
    role: "admin",
    branch_code: null, // Admins see every branch — no branch_id needed
  },
  {
    full_name: "Hamza Sheikh",
    email: "admin.multan@foggynook.pk",
    password: DEFAULT_PASSWORD,
    role: "admin",
    branch_code: null,
  },
  {
    full_name: "Ali Raza",
    email: "manager.vehari@foggynook.pk",
    password: DEFAULT_PASSWORD,
    role: "manager",
    branch_code: "VHR",
  },
  {
    full_name: "Usman Tariq",
    email: "manager.multan@foggynook.pk",
    password: DEFAULT_PASSWORD,
    role: "manager",
    branch_code: "MUL",
  },
  {
    full_name: "Fahad Iqbal",
    email: "manager.lahore@foggynook.pk",
    password: DEFAULT_PASSWORD,
    role: "manager",
    branch_code: "LHR",
  },
];

async function findExistingUser(email) {
  // Admin API doesn't support filtering by email directly across all pages,
  // so we page through — fine for a small seed script.
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function main() {
  console.log("\n🏪 Foggy Nook — seeding demo users\n");

  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id, code, name");
  if (branchError) {
    console.error("✗ Could not read branches — did you run supabase/schema.sql first?");
    console.error(branchError.message);
    console.error("   → cause:", branchError.cause);
    process.exit(1);
  }

  const branchByCode = new Map(branches.map((b) => [b.code, b]));
  const results = [];

  for (const u of USERS) {
    const branch = u.branch_code ? branchByCode.get(u.branch_code) : null;
    if (u.branch_code && !branch) {
      console.warn(`⚠ Skipping ${u.email} — no branch found with code "${u.branch_code}"`);
      continue;
    }

    const existing = await findExistingUser(u.email);

    if (existing) {
      // Re-sync role/branch in case the profile drifted from this seed list.
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: u.full_name,
          role: u.role,
          branch_id: branch?.id ?? null,
          is_active: true,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.warn(`⚠ ${u.email} exists but profile sync failed: ${updateError.message}`);
      } else {
        console.log(`↺ ${u.email} already existed — profile re-synced (role: ${u.role})`);
      }
      results.push({ ...u, status: "existing" });
      continue;
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: {
        full_name: u.full_name,
        role: u.role,
        branch_id: branch?.id ?? undefined,
      },
    });

    if (createError) {
      console.error(`✗ Failed to create ${u.email}: ${createError.message}`);
      console.error("   → full error:", JSON.stringify(createError, Object.getOwnPropertyNames(createError), 2));
      console.error("   → status:", createError.status, "code:", createError.code);
      continue;
    }

    console.log(`✓ Created ${u.role.padEnd(12)} ${u.email}${branch ? `  (${branch.name})` : ""}`);
    results.push({ ...u, status: "created", id: created.user?.id });
  }

  console.log("\n─────────────────────────────────────────────");
  console.log("  Login credentials (change passwords after first login)");
  console.log("─────────────────────────────────────────────");
  for (const r of results) {
    console.log(`  ${r.role.padEnd(12)} ${r.email.padEnd(30)} ${r.password}`);
  }
  console.log("─────────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error("\n✗ Seed script failed:", err.message);
  process.exit(1);
});
