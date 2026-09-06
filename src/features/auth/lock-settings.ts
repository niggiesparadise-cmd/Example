"use client";

import { useSyncExternalStore } from "react";

/**
 * How long the app may sit in the background before it locks again.
 *
 * This is a preference, not a secret — it says *when* to challenge, never
 * whether the challenge can be skipped — so it lives in ordinary storage. The
 * session it guards is in the Keystore.
 */

export const LOCK_INTERVALS = [
  { id: "immediate", label: "Immediately", ms: 0 },
  { id: "30s", label: "After 30 seconds", ms: 30_000 },
  { id: "1m", label: "After 1 minute", ms: 60_000 },
  { id: "5m", label: "After 5 minutes", ms: 300_000 },
  { id: "15m", label: "After 15 minutes", ms: 900_000 },
] as const;

export type LockIntervalId = (typeof LOCK_INTERVALS)[number]["id"];

const STORAGE_KEY = "study-dashboard.lock-interval";
const DEFAULT_INTERVAL: LockIntervalId = "1m";

function isKnown(value: string | null): value is LockIntervalId {
  return value !== null && LOCK_INTERVALS.some((option) => option.id === value);
}

function read(): LockIntervalId {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isKnown(stored)) return stored;
  } catch {
    // A WebView with storage disabled falls back to the default, which still
    // locks — the preference can only ever shorten or lengthen the interval.
  }
  return DEFAULT_INTERVAL;
}

/**
 * Read through `useSyncExternalStore` rather than seeded in an effect.
 *
 * `localStorage` does not exist during the static render, so the value has to
 * arrive after hydration. This is the supported way to do that: the server
 * snapshot is the default, the client snapshot is the stored value, and React
 * handles the transition without a cascading re-render.
 */
const listeners = new Set<() => void>();
let snapshot: LockIntervalId | undefined;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): LockIntervalId {
  // Cached so the snapshot is referentially stable between renders.
  snapshot ??= read();
  return snapshot;
}

const getServerSnapshot = (): LockIntervalId => DEFAULT_INTERVAL;

export function useLockInterval(): LockIntervalId {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setLockIntervalId(id: LockIntervalId): void {
  snapshot = id;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Not persisting a preference is survivable; it applies for this run.
  }
  for (const listener of listeners) listener();
}

export function lockIntervalMs(id: LockIntervalId): number {
  return LOCK_INTERVALS.find((option) => option.id === id)?.ms ?? 60_000;
}
