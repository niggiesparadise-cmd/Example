import type { StudySession } from "@/lib/supabase/database.types";
import { getSupabase, requireUserId, unwrap, unwrapMaybe } from "../shared/api";

/**
 * Study sessions.
 *
 * `duration_minutes` is a generated column — the database computes it from the
 * timestamps, so a stopped session can never report a duration that disagrees
 * with its own clock, however the row was written.
 */

/** The session currently running, if any. At most one exists per user. */
export async function getRunningSession(): Promise<StudySession | null> {
  return unwrapMaybe(
    await getSupabase()
      .from("study_sessions")
      .select("*")
      .is("ended_at", null)
      .maybeSingle(),
  );
}

/**
 * Starts the timer.
 *
 * A partial unique index enforces one running session per user, so a double tap
 * (or two devices) raises a unique violation rather than silently creating two
 * overlapping timers.
 */
export async function startSession(courseId: string | null): Promise<StudySession> {
  const user_id = await requireUserId();
  return unwrap(
    await getSupabase()
      .from("study_sessions")
      .insert({
        user_id,
        course_id: courseId,
        started_at: new Date().toISOString(),
        ended_at: null,
        focus: null,
        note: null,
      })
      .select()
      .single(),
  );
}

export async function stopSession(id: string, focus?: number): Promise<StudySession> {
  return unwrap(
    await getSupabase()
      .from("study_sessions")
      .update({ ended_at: new Date().toISOString(), focus: focus ?? null })
      .eq("id", id)
      .select()
      .single(),
  );
}

/** Completed sessions from `since` (ISO date) onwards, newest first. */
export async function listSessions(since: string): Promise<StudySession[]> {
  return unwrap(
    await getSupabase()
      .from("study_sessions")
      .select("*")
      .not("ended_at", "is", null)
      .gte("started_at", `${since}T00:00:00.000Z`)
      .order("started_at", { ascending: false }),
  );
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await getSupabase().from("study_sessions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
