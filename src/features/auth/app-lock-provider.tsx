"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getBiometricAvailability,
  isNativeApp,
  verifyBiometric,
  type BiometricAvailability,
  type BiometricFailure,
} from "@/lib/native/biometric";
import { useAuth } from "./auth-provider";
import {
  lockIntervalMs,
  setLockIntervalId as persistLockInterval,
  useLockInterval,
  type LockIntervalId,
} from "./lock-settings";

/**
 * Whether the stored session may currently be used.
 *
 * - `checking`   — asking the device what it supports; nothing is shown yet.
 * - `locked`     — a session exists but has not been unlocked in this run.
 * - `unlocked`   — the prompt succeeded. In memory only, never persisted.
 * - `unsupported`— the device offers neither biometrics nor a screen lock.
 */
export type LockStatus = "checking" | "locked" | "unlocked" | "unsupported";

export interface AppLockState {
  status: LockStatus;
  /** True while the system prompt is on screen. */
  isPrompting: boolean;
  lastFailure: { code: BiometricFailure; message: string } | undefined;
  availability: BiometricAvailability | undefined;
  intervalId: LockIntervalId;
  setIntervalId: (id: LockIntervalId) => void;
  /** Shows the prompt. Resolves true only on a verified success. */
  unlock: () => Promise<boolean>;
  /** Drops back to locked — used on sign-out so the next session re-challenges. */
  lock: () => void;
}

const AppLockContext = createContext<AppLockState | undefined>(undefined);

/**
 * The biometric lock.
 *
 * The rule this enforces is narrow and absolute: on Android, a stored Supabase
 * session may not be used until Android has confirmed the device owner is
 * present, in *this* run of the app. Nothing about a previous success is
 * remembered — `status` is React state, so every cold start begins locked, and
 * there is no persisted "already authenticated" flag to trust.
 *
 * The lock protects access to a session that Supabase issued. It is not an
 * authentication factor: it cannot mint a session, and failing it does not sign
 * the user out, it simply refuses to open what is already there.
 *
 * In a browser this is inert — `isNativeApp()` is false, `status` is
 * `unlocked`, and the web build behaves exactly as it did before.
 */
export function AppLockProvider({ children }: { children: ReactNode }) {
  const { session, sessionEpoch } = useAuth();
  const hasSession = Boolean(session);
  const native = isNativeApp();

  const [isPrompting, setIsPrompting] = useState(false);
  const [availability, setAvailability] = useState<
    BiometricAvailability | undefined
  >(undefined);
  const [lastFailure, setLastFailure] =
    useState<AppLockState["lastFailure"]>(undefined);
  const intervalId = useLockInterval();

  /**
   * Which session was unlocked, rather than a bare "unlocked" flag.
   *
   * Comparing against the current epoch is what makes the guarantee hold across
   * a sign-out: state alone would survive into the next session, because this
   * provider sits above the router and is never remounted. `null` means nothing
   * has been unlocked in this run of the app, which is where every cold start
   * begins — there is no persisted flag to trust.
   */
  const [unlockedEpoch, setUnlockedEpoch] = useState<number | null>(null);

  // Ask the device what it can do, once.
  useEffect(() => {
    if (!native) return;

    let cancelled = false;
    void (async () => {
      const result = await getBiometricAvailability();
      if (!cancelled) setAvailability(result);
    })();

    return () => {
      cancelled = true;
    };
  }, [native]);

  /**
   * Derived, never stored.
   *
   * A device with no biometrics *and* no screen lock cannot be challenged, so it
   * is `unsupported` and the lock screen offers signing out rather than entry —
   * requirement 6's "do not silently bypass". It is never treated as unlocked.
   */
  const status: LockStatus = !native
    ? "unlocked"
    : availability === undefined
      ? "checking"
      : !availability.available
        ? "unsupported"
        : hasSession && unlockedEpoch === sessionEpoch
          ? "unlocked"
          : "locked";

  const unlock = useCallback(async (): Promise<boolean> => {
    if (!native) return true;

    setIsPrompting(true);
    setLastFailure(undefined);
    try {
      const result = await verifyBiometric({
        title: "Unlock Study Dashboard",
        subtitle: "Confirm it's you to open your courses, tasks and notes.",
      });

      if (result.ok) {
        setUnlockedEpoch(sessionEpoch);
        return true;
      }

      // Every non-success — a failed match, a cancelled dialog, a lockout —
      // leaves the app exactly where it was: locked.
      setLastFailure({
        code: result.code ?? "failed",
        message: result.message ?? "Not verified.",
      });
      setUnlockedEpoch(null);
      return false;
    } finally {
      setIsPrompting(false);
    }
  }, [native, sessionEpoch]);

  const lock = useCallback(() => {
    if (!native) return;
    setLastFailure(undefined);
    setUnlockedEpoch(null);
  }, [native]);

  const setIntervalId = useCallback(
    (id: LockIntervalId) => persistLockInterval(id),
    [],
  );

  /**
   * Re-lock after the app has been away long enough.
   *
   * `visibilitychange` is what the Android WebView reports when the activity is
   * backgrounded and resumed, so this needs no extra Capacitor plugin. The
   * timestamp is held in a ref rather than state: waking up must not depend on
   * a render having happened while the app was hidden.
   */
  const hiddenAtRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!native) return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        return;
      }

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = undefined;
      if (hiddenAt === undefined) return;

      if (Date.now() - hiddenAt >= lockIntervalMs(intervalId)) lock();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [intervalId, lock, native]);

  const value = useMemo<AppLockState>(
    () => ({
      status,
      isPrompting,
      lastFailure,
      availability,
      intervalId,
      setIntervalId,
      unlock,
      lock,
    }),
    [
      status,
      isPrompting,
      lastFailure,
      availability,
      intervalId,
      setIntervalId,
      unlock,
      lock,
    ],
  );

  return <AppLockContext value={value}>{children}</AppLockContext>;
}

export function useAppLock(): AppLockState {
  const context = use(AppLockContext);
  if (!context)
    throw new Error("useAppLock must be used inside <AppLockProvider>");
  return context;
}
