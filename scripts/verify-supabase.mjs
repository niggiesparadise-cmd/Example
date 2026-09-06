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

// ---------------------------------------------------------------------------
// 6. Every table the app writes to, exercised for real: INSERT, SELECT,
//    UPDATE and DELETE, with the foreign keys wired the way the app wires them.
// ---------------------------------------------------------------------------
const owner = signUp.user.id;
const today = new Date().toISOString().slice(0, 10);

/** Rows created below, so cleanup can remove them even if a check fails. */
const created = { courses: [course?.id].filter(Boolean) };
const remember = (table, id) => {
  (created[table] ??= []).push(id);
};

/**
 * Runs the four verbs against one table and records a single result.
 *
 * The row is built from `make`, updated with `patch`, and the update is read
 * back and compared — an UPDATE that silently affects zero rows (the shape RLS
 * failures take) fails here rather than passing quietly.
 */
async function crud(table, make, patch, check) {
  const { data: row, error: createError } = await supabase
    .from(table)
    .insert({ ...make, user_id: owner })
    .select()
    .single();
  if (createError || !row) {
    record(`${table}: INSERT / SELECT / UPDATE / DELETE`, false, `insert failed: ${createError?.message}`);
    return null;
  }
  remember(table, row.id);

  const { data: selected, error: selectError } = await supabase
    .from(table)
    .select("*")
    .eq("id", row.id)
    .single();
  if (selectError || !selected) {
    record(`${table}: INSERT / SELECT / UPDATE / DELETE`, false, `select failed: ${selectError?.message}`);
    return row;
  }

  const { data: updated, error: updateError } = await supabase
    .from(table)
    .update(patch)
    .eq("id", row.id)
    .select()
    .single();
  if (updateError || !updated) {
    record(`${table}: INSERT / SELECT / UPDATE / DELETE`, false, `update failed: ${updateError?.message}`);
    return row;
  }
  if (!check(updated)) {
    record(`${table}: INSERT / SELECT / UPDATE / DELETE`, false, "update did not take effect");
    return row;
  }

  const { data: deleted, error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq("id", row.id)
    .select("id");
  const removed = !deleteError && deleted?.length === 1;
  if (removed) created[table] = created[table].filter((id) => id !== row.id);

  record(
    `${table}: INSERT / SELECT / UPDATE / DELETE`,
    removed,
    removed ? "all four verbs" : `delete failed: ${deleteError?.message ?? "0 rows"}`,
  );
  return row;
}

console.log("\n  Full CRUD across every user table:");

// A parent course the child tables can hang off, kept until the end.
const { data: parent, error: parentError } = await supabase
  .from("courses")
  .insert({ user_id: owner, code: "VERIFY 202", title: "Relationship parent", color_slot: 2 })
  .select()
  .single();
record("Parent course for relationship checks", !parentError && Boolean(parent), parentError?.message ?? "created");
if (parent?.id) remember("courses", parent.id);

await crud("courses", { code: "VERIFY 303", title: "CRUD course", color_slot: 3 }, { title: "CRUD course (edited)" }, (r) => r.title === "CRUD course (edited)");

if (parent?.id) {
  await crud("topics", { course_id: parent.id, title: "CRUD topic", position: 0, is_complete: false }, { is_complete: true }, (r) => r.is_complete === true);
  await crud("lectures", { course_id: parent.id, title: "CRUD lecture", lecture_date: today, position: 0, notes: null }, { title: "CRUD lecture (edited)" }, (r) => r.title === "CRUD lecture (edited)");
}

await crud("tasks", { title: "CRUD task", kind: "assignment", status: "todo", priority: "medium", due_date: today, estimate_minutes: 30, checklist_done: 0, checklist_total: 2 }, { status: "done" }, (r) => r.status === "done" && r.completed_at !== null);
await crud("exams", { title: "CRUD exam", kind: "quiz", exam_date: today, start_time: "09:00", end_time: "10:00", location: null, weight: 10, preparation: 0, topics: ["a"], notes: null }, { preparation: 50 }, (r) => r.preparation === 50);
await crud("notes", { title: "CRUD note", content: "body", tags: [], is_pinned: false, course_id: null, topic_id: null }, { is_pinned: true }, (r) => r.is_pinned === true);
await crud("schedule_events", { title: "CRUD event", kind: "lecture", event_date: today, start_time: "11:00", end_time: "12:00", location: null, note: null, course_id: null }, { location: "Room 2" }, (r) => r.location === "Room 2");

// study_sessions is the one table with a generated column to prove out.
const startedAt = new Date(Date.now() - 45 * 60_000).toISOString();
const { data: session, error: sessionError } = await supabase
  .from("study_sessions")
  .insert({ user_id: owner, course_id: parent?.id ?? null, started_at: startedAt, ended_at: null, focus: null, note: null })
  .select()
  .single();
if (session?.id) remember("study_sessions", session.id);
record("study_sessions: INSERT (timer running)", !sessionError && session?.ended_at === null, sessionError?.message ?? "running");

const { data: stopped, error: stopError } = await supabase
  .from("study_sessions")
  .update({ ended_at: new Date().toISOString(), focus: 80 })
  .eq("id", session?.id ?? "")
  .select()
  .single();
record(
  "study_sessions: duration_minutes generated by Postgres",
  !stopError && stopped?.duration_minutes >= 44 && stopped?.duration_minutes <= 46,
  stopError?.message ?? `${stopped?.duration_minutes} minutes from a 45-minute session`,
);

// profiles: UPDATE only. The row is created by the trigger and deleted with the
// account, so insert/delete are not paths the app uses.
const { data: profileUpdate, error: profileUpdateError } = await supabase
  .from("profiles")
  .update({ daily_goal_minutes: 240 })
  .eq("id", owner)
  .select()
  .single();
record(
  "profiles: UPDATE",
  !profileUpdateError && profileUpdate?.daily_goal_minutes === 240,
  profileUpdateError?.message ?? "goal updated",
);

// Foreign keys: deleting a course must cascade to topics and lectures while
// leaving tasks in place with a null course_id.
if (parent?.id) {
  await supabase.from("topics").insert({ user_id: owner, course_id: parent.id, title: "FK topic", position: 0, is_complete: false });
  const { data: fkTask } = await supabase
    .from("tasks")
    .insert({ user_id: owner, course_id: parent.id, title: "FK task", kind: "assignment", status: "todo", priority: "low", due_date: null, estimate_minutes: null, checklist_done: 0, checklist_total: 0 })
    .select()
    .single();
  if (fkTask?.id) remember("tasks", fkTask.id);

  await supabase.from("courses").delete().eq("id", parent.id);
  created.courses = created.courses.filter((id) => id !== parent.id);

  const { data: orphanTopics } = await supabase.from("topics").select("id").eq("course_id", parent.id);
  const { data: orphanTask } = await supabase.from("tasks").select("course_id").eq("id", fkTask?.id ?? "").maybeSingle();
  record(
    "Foreign keys: course delete cascades topics, orphans tasks",
    (orphanTopics?.length ?? 0) === 0 && orphanTask !== null && orphanTask?.course_id === null,
    `${orphanTopics?.length ?? 0} topic(s) left, task course_id=${orphanTask?.course_id}`,
  );
}

// ---------------------------------------------------------------------------
// 7. Two real users: the isolation RLS exists to provide.
// ---------------------------------------------------------------------------
console.log("\n  Cross-user isolation:");

const intruderEmail = `verify-intruder-${Date.now()}@example.com`;
const intruder = createClient(url, key, { auth: { persistSession: false } });
const { data: intruderSignUp, error: intruderError } = await intruder.auth.signUp({
  email: intruderEmail,
  password: `${password}-b`,
  options: { data: { full_name: "Intruder" } },
});

if (intruderError || !intruderSignUp?.session) {
  record("Second user created", false, intruderError?.message ?? "no session (email confirmation on?)");
} else {
  record("Second user created", true, `user ${intruderSignUp.user.id.slice(0, 8)}…`);

  // A row belonging to the first user, left in place for the intruder to try.
  const { data: victim } = await supabase
    .from("notes")
    .insert({ user_id: owner, title: "Private note", content: "secret", tags: [], is_pinned: false, course_id: null, topic_id: null })
    .select()
    .single();
  if (victim?.id) remember("notes", victim.id);

  const { data: seen } = await intruder.from("notes").select("*").eq("id", victim?.id ?? "");
  record("Another user cannot SELECT your rows", (seen?.length ?? 0) === 0, `${seen?.length ?? 0} row(s) visible`);

  const { data: hacked } = await intruder
    .from("notes")
    .update({ content: "HACKED" })
    .eq("id", victim?.id ?? "")
    .select("id");
  record("Another user cannot UPDATE your rows", (hacked?.length ?? 0) === 0, `${hacked?.length ?? 0} row(s) changed`);

  const { data: wiped } = await intruder
    .from("notes")
    .delete()
    .eq("id", victim?.id ?? "")
    .select("id");
  record("Another user cannot DELETE your rows", (wiped?.length ?? 0) === 0, `${wiped?.length ?? 0} row(s) deleted`);

  // And the row is provably untouched from the owner's side.
  const { data: stillThere } = await supabase.from("notes").select("content").eq("id", victim?.id ?? "").maybeSingle();
  record("Your row survives the attempt unchanged", stillThere?.content === "secret", `content=${stillThere?.content}`);

  // Writing a row stamped with somebody else's user_id must be refused outright.
  const { error: forgeError } = await intruder
    .from("notes")
    .insert({ user_id: owner, title: "Forged", content: "x", tags: [], is_pinned: false, course_id: null, topic_id: null });
  record("Another user cannot INSERT rows owned by you", Boolean(forgeError), forgeError?.message ?? "the insert was allowed");

  await intruder.auth.signOut();
}

// 8. Clean up everything this run created.
for (const [table, ids] of Object.entries(created)) {
  for (const id of ids) {
    if (id) await supabase.from(table).delete().eq("id", id);
  }
}
const { data: leftovers } = await supabase.from("courses").select("id");
record("Cleanup (DELETE)", (leftovers?.length ?? 0) === 0, `${leftovers?.length ?? 0} course(s) left behind`);

const failed = results.filter((r) => !r.ok);
console.log(
  failed.length === 0
    ? "\nAll checks passed — the database is connected and RLS is working.\n" +
        `Test account ${email} remains; delete it in Authentication → Users.\n`
    : `\n${failed.length} check(s) failed. See the messages above.\n`,
);
process.exit(failed.length === 0 ? 0 : 1);
