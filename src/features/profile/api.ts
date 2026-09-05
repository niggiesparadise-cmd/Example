import type { Profile } from "@/lib/supabase/database.types";
import { getSupabase, requireUserId, unwrap, unwrapMaybe } from "../shared/api";

/**
 * The signed-in user's profile.
 *
 * A row is created by a database trigger on signup, so this should always find
 * one; `maybeSingle` keeps a missing row from throwing for accounts created
 * before that trigger existed.
 */
export async function getProfile(): Promise<Profile | null> {
  const userId = await requireUserId();
  return unwrapMaybe(await getSupabase().from("profiles").select("*").eq("id", userId).maybeSingle());
}

export async function updateProfile(input: Partial<Profile>): Promise<Profile> {
  const userId = await requireUserId();
  return unwrap(
    await getSupabase().from("profiles").update(input).eq("id", userId).select().single(),
  );
}
