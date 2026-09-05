/**
 * End-to-end check that the app can actually reach and use your Supabase project.
 *
 *   node scripts/verify-supabase.mjs
 *
 * Reads the same variables the app does, then performs a REAL authenticated
 * round trip: sign up (or sign in), insert a row, read it back, confirm the
 * signup trigger created a profile, and clean up. Nothing here is mocked — if
 * it prints PASS, the database is genuinely connected and RLS is letting the
 * owner through.
 *
 * It also checks the negative case: that an unauthenticated client cannot read
 * the same table.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

// Load .env.local without adding a dependency.
for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL and/or the publishable key.");
  console.error("Set them in .env.local — see .env.example.");
  process.exit(1);
}

if (/service_role|sb_secret/i.test(key)) {
  console.error("That looks like a SECRET key. Use the publishable/anon key — never the service-role key.");
  process.exit(1);
}

console.log(`Project: ${url}`);
console.log(`Key    : ${key.slice(0, 12)}…\n`);

const email = `verify-${Date.now()}@example.com`;
const password = `Verify-${Math.random().toString(36).slice(2)}-9xZ`;
const supabase = createClient(url, key, { auth: { persistSession: false } });

// 1. Reachability
try {
  const response = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
  record("Auth endpoint reachable", response.ok, `HTTP ${response.status}`);
} catch (cause) {
  record("Auth endpoint reachable", false, String(cause));
}

// 2. Sign up — proves Auth works and the profile trigger fires
const { data: signUp, error: signUpError } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name: "Verification User" } },
});
record("Sign up", !signUpError, signUpError?.message ?? `user ${signUp?.user?.id?.slice(0, 8)}…`);

// Distinguish "sign-up failed" from "sign-up worked but needs confirmation" —
// they call for completely different fixes.
if (signUpError) {
  console.log(
    "\nSign up failed, so the write path could not be tested.\n" +
      "  · HTTP 403 / \"Host not in allow list\" means the network is blocking Supabase.\n" +
      "  · \"Database error saving new user\" usually means the migrations have not been\n" +
      "    applied yet — run them, then re-run this script.\n",
  );
  process.exit(1);
}

if (!signUp?.session) {
  console.log(
    "\n  Email confirmation is ON, so there is no session to test writes with.\n" +
      "  Either confirm the address, or turn it off in Authentication → Providers → Email\n" +
      "  and re-run. Everything above this line passed.\n",
  );
  process.exit(0);
}

// 3. The signup trigger should have created exactly one profile, visible to its owner
const { data: profiles, error: profileError } = await supabase.from("profiles").select("id, full_name");
record(
  "Profile auto-created by trigger",
  !profileError && profiles?.length === 1,
  profileError?.message ?? `${profiles?.length ?? 0} profile(s) visible`,
);

// 4. A real authenticated write, then read back
const { data: course, error: insertError } = await supabase
  .from("courses")
  .insert({ user_id: signUp.user.id, code: "VERIFY 101", title: "Connection check", color_slot: 1 })
  .select()
  .single();
record("Authenticated INSERT", !insertError, insertError?.message ?? `course ${course?.id?.slice(0, 8)}…`);

const { data: readBack, error: readError } = await supabase.from("courses").select("*");
record(
  "Authenticated SELECT reads it back",
  !readError && readBack?.length === 1,
  readError?.message ?? `${readBack?.length ?? 0} row(s)`,
);

// 5. The negative case: a signed-out client must see nothing
const anonClient = createClient(url, key, { auth: { persistSession: false } });
const { data: anonRows, error: anonError } = await anonClient.from("courses").select("*");
record(
  "Signed-out client is blocked by RLS",
  (anonRows?.length ?? 0) === 0,
  anonError ? `denied: ${anonError.message}` : `${anonRows?.length ?? 0} row(s) visible`,
);

// 6. Clean up
if (course?.id) {
  const { error: deleteError } = await supabase.from("courses").delete().eq("id", course.id);
  record("Cleanup (DELETE)", !deleteError, deleteError?.message ?? "removed");
}

const failed = results.filter((r) => !r.ok);
console.log(
  failed.length === 0
    ? "\nAll checks passed — the database is connected and RLS is working.\n" +
        `Test account ${email} remains; delete it in Authentication → Users.\n`
    : `\n${failed.length} check(s) failed. See the messages above.\n`,
);
process.exit(failed.length === 0 ? 0 : 1);
