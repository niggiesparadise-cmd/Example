import type { Flashcard, FlashcardRating, Insert } from "@/lib/supabase/database.types";
import { deleteRow, getSupabase, requireUserId, unwrap } from "../shared/api";

/**
 * Flashcards.
 *
 * The scheduling columns (`due_at`, `interval_days`, `ease`, `review_count`,
 * `last_rating`) are never written from here: recording a review inserts a row
 * into `flashcard_reviews`, and a database trigger derives the schedule from
 * it. That keeps the schedule and the reviews that produced it from ever
 * disagreeing, and stops a second device overwriting it with a stale answer.
 */

export type FlashcardInput = Omit<
  Insert<Flashcard>,
  "due_at" | "interval_days" | "ease" | "review_count" | "last_rating"
>;

export async function listFlashcards(): Promise<Flashcard[]> {
  return unwrap(
    await getSupabase()
      .from("flashcards")
      .select("*")
      .order("due_at", { ascending: true })
      .order("created_at", { ascending: false }),
  );
}

/**
 * The cards to study now: everything already due, soonest first.
 *
 * `limit` keeps a neglected deck of several hundred from arriving in one
 * response — a study session is a sitting, not an inventory.
 */
export async function listDueFlashcards(courseId?: string | null, limit = 40): Promise<Flashcard[]> {
  let query = getSupabase()
    .from("flashcards")
    .select("*")
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true })
    .limit(limit);

  if (courseId) query = query.eq("course_id", courseId);
  return unwrap(await query);
}

/** How many cards are waiting, without fetching them. */
export async function countDueFlashcards(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("flashcards")
    .select("id", { count: "exact", head: true })
    .lte("due_at", new Date().toISOString());
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Reviews recorded since `since` (ISO timestamp) — drives "studied today". */
export async function countReviewsSince(since: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from("flashcard_reviews")
    .select("id", { count: "exact", head: true })
    .gte("reviewed_at", since);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function createFlashcard(input: FlashcardInput): Promise<Flashcard> {
  const user_id = await requireUserId();
  return unwrap(await getSupabase().from("flashcards").insert({ ...input, user_id }).select().single());
}

export async function updateFlashcard(id: string, input: Partial<FlashcardInput>): Promise<Flashcard> {
  return unwrap(await getSupabase().from("flashcards").update(input).eq("id", id).select().single());
}

export async function deleteFlashcard(id: string): Promise<void> {
  await deleteRow("flashcards", id);
}

/**
 * Records a rating. The returned card carries the schedule the trigger just
 * computed, so the UI never has to guess when the card comes back.
 */
export async function reviewFlashcard(
  flashcardId: string,
  rating: FlashcardRating,
  durationMs?: number,
): Promise<Flashcard> {
  const user_id = await requireUserId();
  const supabase = getSupabase();

  const { error } = await supabase.from("flashcard_reviews").insert({
    user_id,
    flashcard_id: flashcardId,
    rating,
    duration_ms: durationMs ?? null,
  });
  if (error) throw new Error(error.message);

  return unwrap(await supabase.from("flashcards").select("*").eq("id", flashcardId).single());
}
