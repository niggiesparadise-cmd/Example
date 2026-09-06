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

}

// ---------------------------------------------------------------------------
// 7b. The learning and social features: flashcards, quizzes, challenges.
// ---------------------------------------------------------------------------

/*
 * Check the newer migrations are actually applied before testing them.
 *
 * Without this, a project still on 0004 produces a dozen confusing failures
 * ("could not find the function in the schema cache") that all mean the same
 * thing. One clear message is more use than thirteen symptoms of it.
 */
const missingTable = /does not exist|schema cache|relation/i;
const { error: schemaProbe } = await supabase.from("flashcards").select("id").limit(1);
const { error: sublectureProbe } = await supabase.from("sublectures").select("id").limit(1);

const missing = [];
if (schemaProbe && missingTable.test(schemaProbe.message)) {
  missing.push("supabase/migrations/0005_learning_features.sql", "supabase/migrations/0006_social_challenges.sql");
}
if (sublectureProbe && missingTable.test(sublectureProbe.message)) {
  missing.push("supabase/migrations/0007_sublectures_and_notifications.sql");
}

if (missing.length > 0) {
  record("Every migration is applied", false, `${missing.length} migration(s) missing`);
  console.log(
    "\n  Everything above passed. The checks below need migrations that have not\n" +
      "  been applied to this project yet:\n\n" +
      missing.map((file) => `    ${file}`).join("\n") +
      "\n\n  Paste each into the Supabase SQL editor, in that order, then re-run this\n" +
      "  workflow. Migrations already applied are not re-run.\n",
  );
} else {

console.log("\n  Learning features:");

const flashcardCourse = await supabase
  .from("courses")
  .insert({ user_id: owner, code: "VERIFY 404", title: "Flashcard parent", color_slot: 4 })
  .select()
  .single();
if (flashcardCourse.data?.id) remember("courses", flashcardCourse.data.id);

// Flashcards: the scheduling columns are the trigger's, so this proves the
// trigger exists and fires rather than just that a row can be written.
const { data: card, error: cardError } = await supabase
  .from("flashcards")
  .insert({
    user_id: owner,
    course_id: flashcardCourse.data?.id ?? null,
    topic_id: null,
    front: "Which enzyme does aspirin inhibit?",
    back: "Cyclo-oxygenase",
  })
  .select()
  .single();
if (card?.id) remember("flashcards", card.id);
record(
  "flashcards: INSERT, with the schedule defaulted",
  !cardError && card?.due_at != null && card?.review_count === 0,
  cardError?.message ?? `due_at set, ${card?.review_count} reviews`,
);

const { error: reviewError } = await supabase
  .from("flashcard_reviews")
  .insert({ user_id: owner, flashcard_id: card?.id ?? "", rating: "good", duration_ms: 4200 });
const { data: reviewed } = await supabase
  .from("flashcards")
  .select("*")
  .eq("id", card?.id ?? "")
  .maybeSingle();
record(
  "flashcard_reviews: the trigger reschedules the card",
  !reviewError && reviewed?.review_count === 1 && Number(reviewed?.interval_days) > 0,
  reviewError?.message ?? `interval ${reviewed?.interval_days} days after one "good"`,
);

// Quizzes, questions and options — the two tables owned through a parent.
const { data: quiz, error: quizError } = await supabase
  .from("quizzes")
  .insert({ user_id: owner, course_id: flashcardCourse.data?.id ?? null, topic_id: null, title: "Verification quiz", description: null })
  .select()
  .single();
if (quiz?.id) remember("quizzes", quiz.id);
record("quizzes: INSERT", !quizError && Boolean(quiz), quizError?.message ?? "created");

const { data: question, error: questionError } = await supabase
  .from("quiz_questions")
  .insert({ quiz_id: quiz?.id ?? "", question: "Is this quiz real?", kind: "true-false", explanation: "It is.", position: 0 })
  .select()
  .single();
record(
  "quiz_questions: INSERT through the parent quiz's policy",
  !questionError && Boolean(question),
  questionError?.message ?? "created",
);

const { error: optionError } = await supabase.from("quiz_options").insert([
  { question_id: question?.id ?? "", option_text: "True", is_correct: true, position: 0 },
  { question_id: question?.id ?? "", option_text: "False", is_correct: false, position: 1 },
]);
const { data: readOptions } = await supabase
  .from("quiz_options")
  .select("*")
  .eq("question_id", question?.id ?? "");
record(
  "quiz_options: INSERT and SELECT through two levels of ownership",
  !optionError && readOptions?.length === 2,
  optionError?.message ?? `${readOptions?.length ?? 0} options`,
);

const { data: attempt, error: attemptError } = await supabase
  .from("quiz_attempts")
  .insert({
    user_id: owner,
    quiz_id: quiz?.id ?? "",
    score: 1,
    total_questions: 1,
    duration_seconds: 30,
    incorrect_question_ids: [],
  })
  .select()
  .single();
if (attempt?.id) remember("quiz_attempts", attempt.id);
record("quiz_attempts: INSERT", !attemptError && Boolean(attempt), attemptError?.message ?? "recorded");

// A username, so the second user can find this one.
const myUsername = `verify${Date.now().toString().slice(-8)}`;
const { error: usernameError } = await supabase
  .from("profiles")
  .update({ username: myUsername })
  .eq("id", owner);
record("profiles: username can be set", !usernameError, usernameError?.message ?? myUsername);

// ---------------------------------------------------------------------------
// 7c. The rules that matter most: a second user against a challenge.
// ---------------------------------------------------------------------------
if (intruderSignUp?.session) {
  console.log("\n  Challenge authorisation:");

  const intruderName = `rival${Date.now().toString().slice(-8)}`;
  await intruder.from("profiles").update({ username: intruderName }).eq("id", intruderSignUp.user.id);

  // A stranger cannot see a quiz they were never challenged to.
  const { data: peek } = await intruder.from("quizzes").select("*").eq("id", quiz?.id ?? "");
  record("Another user cannot see your quiz", (peek?.length ?? 0) === 0, `${peek?.length ?? 0} row(s)`);

  const { data: peekCards } = await intruder.from("flashcards").select("*");
  record("Another user cannot see your flashcards", (peekCards?.length ?? 0) === 0, `${peekCards?.length ?? 0} row(s)`);

  // Create the challenge through the function.
  const { data: challengeId, error: challengeError } = await supabase.rpc("create_challenge", {
    quiz: quiz?.id ?? "",
    opponent_username: intruderName,
    challenge_title: "Verification challenge",
  });
  record("create_challenge builds the challenge and both participants", !challengeError && Boolean(challengeId), challengeError?.message ?? String(challengeId).slice(0, 8));

  if (challengeId) remember("challenges", challengeId);

  // Now — and only now — the opponent can read the quiz.
  const { data: nowVisible } = await intruder.from("quizzes").select("*").eq("id", quiz?.id ?? "");
  const { data: stillHidden } = await intruder.from("flashcards").select("*");
  record(
    "Being challenged reveals that quiz and nothing else",
    (nowVisible?.length ?? 0) === 1 && (stillHidden?.length ?? 0) === 0,
    `quiz visible: ${nowVisible?.length ?? 0}, flashcards visible: ${stillHidden?.length ?? 0}`,
  );

  // The creator cannot answer their own invitation.
  // Specifically the authorisation refusal — "the function does not exist"
  // must not be allowed to look like a passing security check.
  const { error: selfAnswer } = await supabase.rpc("respond_to_challenge", { challenge: challengeId, accept: true });
  record(
    "Only the invited person can answer the invitation",
    /not yours to answer|already been answered/i.test(selfAnswer?.message ?? ""),
    selfAnswer?.message ?? "the creator was allowed to accept",
  );

  const { error: acceptError } = await intruder.rpc("respond_to_challenge", { challenge: challengeId, accept: true });
  record("The invited person can accept", !acceptError, acceptError?.message ?? "accepted");

  // Each records their own result.
  const { error: mineError } = await supabase.rpc("submit_challenge_result", {
    challenge: challengeId, final_score: 1, question_count: 1, seconds_taken: 40,
  });
  record("You can record your own result", !mineError, mineError?.message ?? "recorded");

  // THE rule: the opponent cannot rewrite your score by any route.
  const { data: tampered } = await intruder
    .from("challenge_participants")
    .update({ score: 0, duration_seconds: 9999 })
    .eq("user_id", owner)
    .select("id");
  record(
    "Another user cannot overwrite your score",
    (tampered?.length ?? 0) === 0,
    `${tampered?.length ?? 0} row(s) changed`,
  );

  const { data: intact } = await supabase
    .from("challenge_participants")
    .select("score, duration_seconds")
    .eq("user_id", owner)
    .maybeSingle();
  record(
    "Your recorded result survives the attempt",
    intact?.score === 1 && intact?.duration_seconds === 40,
    `score=${intact?.score} seconds=${intact?.duration_seconds}`,
  );

  // And cannot be improved by replaying your own submission.
  const { error: replayError } = await supabase.rpc("submit_challenge_result", {
    challenge: challengeId, final_score: 1, question_count: 1, seconds_taken: 1,
  });
  record(
    "You cannot replay your own submission",
    /already finished/i.test(replayError?.message ?? ""),
    replayError?.message ?? "the replay was allowed",
  );

  // An impossible score is refused outright.
  const { error: cheatError } = await intruder.rpc("submit_challenge_result", {
    challenge: challengeId, final_score: 99, question_count: 1, seconds_taken: 5,
  });
  record(
    "An impossible score is refused",
    /not possible/i.test(cheatError?.message ?? ""),
    cheatError?.message ?? "it was accepted",
  );

  // The lookup gives back a handle and nothing more.
  const { data: found } = await intruder.rpc("search_profiles", { query: myUsername });
  const columns = found?.[0] ? Object.keys(found[0]).sort().join(",") : "";
  record(
    "Username lookup returns only id, username, full_name, avatar_path",
    columns === "avatar_path,full_name,id,username",
    columns || "no match",
  );

  const { data: toosShort } = await intruder.rpc("search_profiles", { query: "ab" });
  record("Two characters enumerate nothing", (toosShort?.length ?? 0) === 0, `${toosShort?.length ?? 0} row(s)`);

  await intruder.auth.signOut();
}


// ---------------------------------------------------------------------------
// 7d. Sublectures and notifications.
// ---------------------------------------------------------------------------
console.log("\n  Sublectures and notifications:");

const { data: subCourse } = await supabase
  .from("courses")
  .insert({ user_id: owner, code: "VERIFY 505", title: "Sublecture parent", color_slot: 5 })
  .select()
  .single();
if (subCourse?.id) remember("courses", subCourse.id);

const { data: subTopic } = await supabase
  .from("topics")
  .insert({ user_id: owner, course_id: subCourse?.id ?? "", title: "Verification topic", position: 0, is_complete: false })
  .select()
  .single();

const { data: sublecture, error: sublectureError } = await supabase
  .from("sublectures")
  .insert({
    user_id: owner,
    topic_id: subTopic?.id ?? "",
    title: "Verification sublecture",
    description: null,
    scheduled_date: null,
    completed_at: null,
    position: 0,
  })
  .select()
  .single();
if (sublecture?.id) remember("sublectures", sublecture.id);
record("sublectures: INSERT under your own topic", !sublectureError && Boolean(sublecture), sublectureError?.message ?? "created");

const { data: ticked, error: tickError } = await supabase
  .from("sublectures")
  .update({ completed_at: new Date().toISOString() })
  .eq("id", sublecture?.id ?? "")
  .select()
  .single();
record("sublectures: UPDATE marks completion", !tickError && ticked?.completed_at !== null, tickError?.message ?? "completed");

const { data: notification, error: notificationError } = await supabase
  .from("notifications")
  .insert({
    user_id: owner,
    kind: "study-reminder",
    title: "Verification reminder",
    body: null,
    data: {},
    dedupe_key: `verify:${Date.now()}`,
  })
  .select()
  .single();
if (notification?.id) remember("notifications", notification.id);
record("notifications: INSERT for yourself", !notificationError && Boolean(notification), notificationError?.message ?? "created");

const { data: readMarked, error: readError } = await supabase
  .from("notifications")
  .update({ read_at: new Date().toISOString() })
  .eq("id", notification?.id ?? "")
  .select()
  .single();
record("notifications: UPDATE marks as read", !readError && readMarked?.read_at !== null, readError?.message ?? "read");

// The dedupe index: the same reminder twice must produce one row.
const sharedKey = `verify-dupe:${Date.now()}`;
const twice = { user_id: owner, kind: "study-reminder", title: "Same fact", body: null, data: {}, dedupe_key: sharedKey };
await supabase.from("notifications").upsert([twice], { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
await supabase.from("notifications").upsert([twice], { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
const { data: dupes } = await supabase.from("notifications").select("id").eq("dedupe_key", sharedKey);
for (const row of dupes ?? []) remember("notifications", row.id);
record("notifications: dedupe_key keeps one fact to one row", (dupes?.length ?? 0) === 1, `${dupes?.length ?? 0} row(s)`);

if (intruderSignUp?.session) {
  const { data: seenSub } = await intruder.from("sublectures").select("*");
  record("Another user cannot see your sublectures", (seenSub?.length ?? 0) === 0, `${seenSub?.length ?? 0} row(s)`);

  const { data: seenNotif } = await intruder.from("notifications").select("*").eq("user_id", owner);
  record("Another user cannot read your notifications", (seenNotif?.length ?? 0) === 0, `${seenNotif?.length ?? 0} row(s)`);

  const { data: touched } = await intruder
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", owner)
    .select("id");
  record("Another user cannot mark your notifications read", (touched?.length ?? 0) === 0, `${touched?.length ?? 0} row(s)`);

  const { data: wiped } = await intruder.from("sublectures").delete().eq("user_id", owner).select("id");
  record("Another user cannot delete your sublectures", (wiped?.length ?? 0) === 0, `${wiped?.length ?? 0} row(s)`);

  const { error: forged } = await intruder
    .from("notifications")
    .insert({ user_id: owner, kind: "challenge-result", title: "FAKE", body: null, data: {}, dedupe_key: null });
  record("Another user cannot forge a notification for you", Boolean(forged), forged?.message ?? "the insert was allowed");
}

} // end of the learning/social checks

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
