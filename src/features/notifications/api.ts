import type { AppNotification, NotificationKind } from "@/lib/supabase/database.types";
import { addDays, todayIso } from "@/lib/date";
import { deleteRow, getSupabase, requireUserId, unwrap } from "../shared/api";
import { countDueFlashcards } from "../flashcards/api";
import { listExams } from "../exams/api";
import { listTasks } from "../tasks/api";

/**
 * The notification centre.
 *
 * Rows get here two ways, and the difference matters.
 *
 * Some notifications are *events*: somebody challenged you, a challenge you
 * were in finished. Those are written by database triggers at the moment they
 * happen, because they happen to you while you are not looking and nothing on
 * your device could have noticed.
 *
 * The rest are *facts that become true with time*: a task is due today, an exam
 * is on Friday, cards are ready. Nothing happens at the instant they become
 * true, so they are materialised here, when the app next loads. `dedupe_key`
 * and `on conflict do nothing` are what keep opening the app five times from
 * producing five copies of the same reminder.
 */

/** How far ahead an exam counts as "approaching". */
const EXAM_HORIZON_DAYS = 3;

export async function listNotifications(limit = 50): Promise<AppNotification[]> {
  return unwrap(
    await getSupabase()
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}

export async function countUnread(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markRead(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markAllRead(): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

export async function dismiss(id: string): Promise<void> {
  await deleteRow("notifications", id);
}

/** Clears the lot. The RLS policy scopes the delete to the caller's own rows. */
export async function clearAll(): Promise<void> {
  const userId = await requireUserId();
  const { error } = await getSupabase().from("notifications").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

interface Derived {
  kind: NotificationKind;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  dedupe_key: string;
}

/**
 * Works out which time-based reminders are true right now, and writes any that
 * are not already there.
 *
 * Every key carries the date it was derived on, so tomorrow's "due today" is a
 * different notification from today's — and re-running this an hour later
 * writes nothing.
 *
 * Returns how many were new, which is only used to decide whether the list
 * needs refetching.
 */
export async function syncDerivedNotifications(): Promise<number> {
  const userId = await requireUserId();
  const today = todayIso();
  const horizon = addDays(today, EXAM_HORIZON_DAYS);

  const [tasks, exams, dueCards] = await Promise.all([
    listTasks(),
    listExams(),
    countDueFlashcards(),
  ]);

  const derived: Derived[] = [];

  for (const task of tasks) {
    if (task.status === "done" || !task.due_date) continue;
    if (task.due_date > today) continue;

    const overdue = task.due_date < today;
    derived.push({
      kind: "task-due",
      title: overdue ? "Task overdue" : "Task due today",
      body: task.title,
      data: { href: "/tasks/", task_id: task.id },
      // The date is part of the key, so an overdue task reminds you again each
      // day rather than once and never.
      dedupe_key: `task-due:${task.id}:${today}`,
    });
  }

  for (const exam of exams) {
    if (exam.exam_date < today || exam.exam_date > horizon) continue;
    const days = Math.round(
      (Date.parse(`${exam.exam_date}T00:00:00`) - Date.parse(`${today}T00:00:00`)) / 86_400_000,
    );
    derived.push({
      kind: "exam-soon",
      title: days === 0 ? "Exam today" : days === 1 ? "Exam tomorrow" : `Exam in ${days} days`,
      body: exam.title,
      data: { href: "/exams/", exam_id: exam.id },
      dedupe_key: `exam-soon:${exam.id}:${today}`,
    });
  }

  if (dueCards > 0) {
    derived.push({
      kind: "flashcards-due",
      title: `${dueCards} ${dueCards === 1 ? "card" : "cards"} ready to review`,
      body: "Your flashcard schedule has caught up with you.",
      data: { href: "/flashcards/" },
      dedupe_key: `flashcards-due:${today}`,
    });
  }

  if (derived.length === 0) return 0;

  /*
   * One insert for all of them, ignoring the ones already present. The partial
   * unique index on (user_id, dedupe_key) is what makes `ignoreDuplicates` mean
   * "this reminder already exists" rather than silently dropping a real row.
   */
  const { data, error } = await getSupabase()
    .from("notifications")
    .upsert(
      derived.map((item) => ({ ...item, user_id: userId })),
      { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
    )
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

/** Where tapping a notification should go, when it says. */
export function hrefOf(notification: AppNotification): string | undefined {
  const href = notification.data?.href;
  // Only ever an in-app path: `data` is written by a trigger, but treating it
  // as data rather than as a destination costs nothing and rules out surprises.
  return typeof href === "string" && href.startsWith("/") ? href : undefined;
}
