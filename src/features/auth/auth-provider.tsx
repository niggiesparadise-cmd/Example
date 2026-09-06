"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearSecureStorage } from "@/lib/native/secure-storage";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface AuthState {
  session: Session | null;
  user: User | null;
  /** True until the stored session has been restored — routes must wait for this. */
  isLoading: boolean;
  /** Set when the app was built without Supabase credentials. */
  configError: string | null;
  /**
   * Increments on every deliberate sign-in or sign-out, and never on a token
   * refresh. The biometric lock compares against it so that unlocking one
   * session can never carry over to the next — signing out and back in as the
   * same user starts locked again.
   */
  sessionEpoch: number;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ needsEmailConfirmation: boolean }>;
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
  const [sessionEpoch, setSessionEpoch] = useState(0);

  // Derived rather than set in an effect: whether the build was configured is
  // known at module load, not something to discover after mounting.
  const configError = isSupabaseConfigured
    ? runtimeError
    : "This build has no Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY), then rebuild.";

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = getSupabase();

    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((cause: unknown) =>
        setRuntimeError(cause instanceof Error ? cause.message : String(cause)),
      )
      .finally(() => setIsLoading(false));

    // Fires on sign in/out, token refresh, and when a recovery link is opened.
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, next) => {
        setSession(next);
        setIsLoading(false);

        // `INITIAL_SESSION` (a restored session) and `TOKEN_REFRESHED` are not
        // new sessions, so they must not advance the epoch: the first would let a
        // cold start count as an unlock, the second would re-lock the app roughly
        // every hour for no reason.
        if (event === "SIGNED_IN" || event === "SIGNED_OUT")
          setSessionEpoch((n) => n + 1);
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(friendlyAuthError(error.message));
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { data, error } = await getSupabase().auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw new Error(friendlyAuthError(error.message));
      // Supabase returns a user with no session when email confirmation is on.
      return { needsEmailConfirmation: Boolean(data.user) && !data.session };
    },
    [],
  );

  /**
   * Signs out everywhere, and — if that cannot be reached — at least here.
   *
   * The default scope revokes the refresh token server-side, which needs the
   * network. On a phone that call can simply fail, and the old behaviour left
   * the tokens sitting on the device while the user believed they had signed
   * out. Falling back to a local sign-out guarantees the device session is
   * gone; the original failure is still reported so nothing is swallowed.
   */
  const signOut = useCallback(async () => {
    const { error } = await getSupabase().auth.signOut();

    // supabase-js removes its own key; this sweeps the encrypted store clean so
    // nothing about the old session is left on the device either way.
    await clearSecureStorage();

    if (!error) return;

    const { error: localError } = await getSupabase().auth.signOut({
      scope: "local",
    });
    await clearSecureStorage();
    if (localError) throw new Error(localError.message);

    throw new Error(
      `Signed out on this device, but couldn't reach Supabase to end the session everywhere: ${error.message}`,
    );
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo:
        typeof window === "undefined"
          ? undefined
          : `${window.location.origin}/reset-password/`,
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
      sessionEpoch,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
    }),
    [
      session,
      isLoading,
      configError,
      sessionEpoch,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
    ],
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
  if (lower.includes("invalid login credentials"))
    return "That email and password don't match an account.";
  if (lower.includes("email not confirmed"))
    return "Check your inbox and confirm your email address first.";
  if (lower.includes("user already registered"))
    return "An account with that email already exists — sign in instead.";
  if (lower.includes("password should be at least"))
    return "Password must be at least 6 characters.";
  if (lower.includes("rate limit") || lower.includes("too many"))
    return "Too many attempts. Wait a minute and try again.";
  return message;
}
