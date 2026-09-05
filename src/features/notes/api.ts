import type { Insert, Note, Update } from "@/lib/supabase/database.types";
import { getSupabase, requireUserId, unwrap } from "../shared/api";

export type NoteInput = Insert<Note>;

export async function listNotes(): Promise<Note[]> {
  return unwrap(
    await getSupabase()
      .from("notes")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false }),
  );
}

/**
 * Full-text search over titles and bodies.
 *
 * Runs against the generated `search_vector` column and its GIN index, so the
 * matching happens in Postgres rather than by pulling every note to the client.
 * `websearch_to_tsquery` accepts what people actually type ("graph -tree").
 */
export async function searchNotes(query: string): Promise<Note[]> {
  const trimmed = query.trim();
  if (!trimmed) return listNotes();

  return unwrap(
    await getSupabase()
      .from("notes")
      .select("*")
      .textSearch("search_vector", trimmed, { type: "websearch", config: "english" })
      .order("updated_at", { ascending: false }),
  );
}

export async function createNote(input: NoteInput): Promise<Note> {
  const user_id = await requireUserId();
  return unwrap(await getSupabase().from("notes").insert({ ...input, user_id }).select().single());
}

export async function updateNote(id: string, input: Update<Note>): Promise<Note> {
  return unwrap(await getSupabase().from("notes").update(input).eq("id", id).select().single());
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await getSupabase().from("notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
