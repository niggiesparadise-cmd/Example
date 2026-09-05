"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface AuthState {
  session: Session | null;
  user: User | null;
  /** True until the stored session has been restored — routes must wait for this. */
  isLoading: boolean;
  /** Set when the app was built without Supabase credentials. */
  configError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Holds the Supabase session for the whole app.
 *
 * Session restoration is asynchronous, so `isLoading` starts true and every
 * guard waits on it — without that, a signed-in user is briefly indistinguishable
 * from a signed-out one and gets bounced to the login screen on every cold start.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Nothing to restore when the build has no credentials, so this starts false
  // and the app renders the configuration screen immediately.
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  // Derived rather than set in an effect: whether the build was configured is
  // known at module load, not something to discover after mounting.
  const configError = isSupabaseConfigured
    ? runtimeError
    : "This build has no Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY and rebuild.";

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = getSupabase();

    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((cause: unknown) => setRuntimeError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setIsLoading(false));

    // Fires on sign in/out, token refresh, and when a recovery link is opened.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setIsLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendlyAuthError(error.message));
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw new Error(friendlyAuthError(error.message));
    // Supabase returns a user with no session when email confirmation is on.
    return { needsEmailConfirmation: Boolean(data.user) && !data.session };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw new Error(error.message);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/reset-password/`,
    });
    if (error) throw new Error(error.message);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await getSupabase().auth.updateUser({ password });
    if (error) throw new Error(friendlyAuthError(error.message));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      configError,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
    }),
    [session, isLoading, configError, signIn, signUp, signOut, requestPasswordReset, updatePassword],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const context = use(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/** Turns Supabase's terse auth errors into something a user can act on. */
function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "That email and password don't match an account.";
  if (lower.includes("email not confirmed")) return "Check your inbox and confirm your email address first.";
  if (lower.includes("user already registered")) return "An account with that email already exists — sign in instead.";
  if (lower.includes("password should be at least")) return "Password must be at least 6 characters.";
  if (lower.includes("rate limit") || lower.includes("too many")) return "Too many attempts. Wait a minute and try again.";
  return message;
}
