/**
 * Supabase configuration, read from build-time environment variables.
 *
 * `NEXT_PUBLIC_*` values are inlined into the bundle at build time — including
 * the bundle packaged inside the Android APK. That is expected and safe for
 * these two values: the anon key is designed to be public and every row it can
 * reach is gated by Row Level Security. The service-role key bypasses RLS and
 * must never appear in this file, this bundle, or any client code.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Whether the app was built with Supabase credentials available. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Throws with an actionable message rather than letting the client fail with an
 * opaque network error deep inside a query.
 */
export function requireSupabaseEnv(): { url: string; anonKey: string } {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see README → Database setup), " +
        "then rebuild — these are inlined at build time, not read at runtime.",
    );
  }
  return { url, anonKey };
}
