"use client";

import { useSyncExternalStore } from "react";

/**
 * A counter that every successful write bumps.
 *
 * Page-level lists refetch themselves through their own `refetch`, but anything
 * mounted *above* the pages cannot: the app frame is not remounted by
 * navigation, so the navigation badges kept showing whatever the counts were
 * when the app started — adding, completing or deleting a task left them stale
 * until the whole app was restarted.
 *
 * Subscribing to this version and putting it in a query's dependency list is
 * enough to keep those long-lived views honest. It is deliberately not a cache:
 * there is nothing to invalidate, only a signal that something changed.
 */
let version = 0;
const listeners = new Set<() => void>();

export function notifyDataChanged(): void {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => version;
// The server render has no writes behind it, so the first version is always 0.
const getServerSnapshot = () => 0;

/** Re-renders the caller whenever any write succeeds. */
export function useDataVersion(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
