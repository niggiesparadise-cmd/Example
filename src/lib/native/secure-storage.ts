"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * A supabase-js storage adapter backed by the Android Keystore.
 *
 * supabase-js keeps the access and refresh tokens in whatever `auth.storage`
 * it is given, and defaults to `localStorage` — which inside a WebView is an
 * unencrypted file in the app's data directory. Handing it this adapter instead
 * means the session is written through `EncryptedSharedPreferences`, whose
 * master key lives in the Keystore and never reaches the app.
 *
 * In a browser there is no Keystore and no APK to protect, so the default
 * `localStorage` is used unchanged and the web build behaves exactly as before.
 */

interface SecureStoragePlugin {
  get: (options: { key: string }) => Promise<{ value: string | null }>;
  set: (options: { key: string; value: string }) => Promise<void>;
  remove: (options: { key: string }) => Promise<void>;
  clear: () => Promise<void>;
}

const plugin = registerPlugin<SecureStoragePlugin>("SecureStorage");

/**
 * The subset of the Storage interface supabase-js actually uses. Its own
 * `SupportedStorage` type allows these to return promises, which is what lets an
 * encrypted, IPC-backed store stand in for `localStorage`.
 */
export interface AsyncStorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export function isSecureStorageAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * The adapter, or `undefined` in a browser so supabase-js keeps its default.
 *
 * Errors are not swallowed into a plaintext fallback: if the Keystore cannot be
 * reached, reads return `null` and writes reject, which surfaces as a failed
 * sign-in rather than a session quietly stored in the clear.
 */
export function getSecureStorageAdapter(): AsyncStorageAdapter | undefined {
  if (!isSecureStorageAvailable()) return undefined;

  return {
    async getItem(key) {
      const { value } = await plugin.get({ key });
      return value;
    },
    async setItem(key, value) {
      await plugin.set({ key, value });
    },
    async removeItem(key) {
      await plugin.remove({ key });
    },
  };
}

/** Wipes every stored token. Called after signing out. */
export async function clearSecureStorage(): Promise<void> {
  if (!isSecureStorageAvailable()) return;
  await plugin.clear();
}
