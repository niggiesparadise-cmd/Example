"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSecureStorageAdapter } from "@/lib/native/secure-storage";
import type { Database } from "./database.types";
import { requireSupabaseEnv } from "./env";

let client: SupabaseClient<Database> | undefined;

/**
 * The browser Supabase client, created once and reused.
 *
 * There is no server counterpart: the app is a static export with no Next.js
 * server, so every query runs in the browser (or the Android WebView) against
 * Supabase directly, with RLS doing the authorisation.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    const { anonKey, url } = requireSupabaseEnv();
    client = createClient<Database>(url, anonKey, {
      auth: {
        /**
         * On Android the session is written through the Keystore-backed store
         * rather than the WebView's `localStorage`, which is an unencrypted
         * file on disk. `undefined` in a browser, where supabase-js keeps its
         * own default.
         */
        storage: getSecureStorageAdapter(),
        // Keeps the user signed in across app restarts — the WebView origin is
        // a stable `https://localhost`, so the stored session survives.
        persistSession: true,
        autoRefreshToken: true,
        // Lets the password-reset and email-confirmation links complete when
        // they land back on the app with tokens in the URL fragment.
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }
  return client;
}
