import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";

/**
 * Shared plumbing for the feature API modules.
 *
 * Components never import `getSupabase` directly — they call a feature's API
 * through its hooks. Keeping the client behind this boundary means a schema or
 * transport change touches each feature's `api.ts` and nothing else.
 */

/** Turns a Postgrest error into something worth showing a user. */
export function describeError(error: PostgrestError): Error {
  // 23505 unique_violation, 23514 check_violation, 42501 insufficient_privilege
  if (error.code === "23505") return new Error("That already exists — pick a different value.");
  if (error.code === "23514") return new Error("Some values are out of range. Check the form and try again.");
  if (error.code === "42501") return new Error("You don't have permission to do that.");
  if (error.message.toLowerCase().includes("row-level security")) {
    return new Error("You don't have permission to do that.");
  }
  if (error.message.toLowerCase().includes("failed to fetch")) {
    return new Error("Can't reach your data. Check your connection and try again.");
  }
  return new Error(error.message);
}

/** Unwraps a Supabase result, throwing a readable error instead of returning one. */
export function unwrap<T>(result: { data: T | null; error: PostgrestError | null }): T {
  if (result.error) throw describeError(result.error);
  if (result.data === null) throw new Error("No data returned.");
  return result.data;
}

/**
 * Runs a delete and insists it actually removed something.
 *
 * `.delete()` reports no error when RLS filters the row out — PostgREST simply
 * deletes nothing and returns success — so a client that checks only `error`
 * tells the user "Deleted." after deleting nothing at all. Asking for the rows
 * back turns that silent no-op into a real failure.
 */
type DeletableTable =
  | "courses"
  | "topics"
  | "lectures"
  | "tasks"
  | "exams"
  | "notes"
  | "schedule_events"
  | "study_sessions"
  | "flashcards"
  | "quizzes"
  | "quiz_questions"
  | "quiz_options"
  | "challenges"
  | "sublectures"
  | "notifications";

export async function deleteRow(table: DeletableTable, id: string): Promise<void> {
  const { data, error } = await getSupabase().from(table).delete().eq("id", id).select("id");
  if (error) throw describeError(error);
  if (!data || data.length === 0) {
    throw new Error("That item no longer exists, or it isn't yours to delete.");
  }
}

/** Unwraps a result whose data may legitimately be absent. */
export function unwrapMaybe<T>(result: { data: T | null; error: PostgrestError | null }): T | null {
  if (result.error) throw describeError(result.error);
  return result.data;
}

/**
 * The signed-in user's id, for stamping `user_id` on inserts.
 *
 * RLS would reject a wrong id anyway — this makes the round trip unnecessary
 * and produces a clearer message when the session has quietly expired.
 */
export async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) throw new Error("Your session has expired. Sign in again.");
  return data.user.id;
}

export { getSupabase };
