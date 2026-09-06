"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import {
  ConfigErrorScreen,
  FullPageLoading,
} from "@/components/ui/data-states";
import { useAuth } from "./auth-provider";

/**
 * Routes reachable without a session.
 *
 * `/reset-password` is split out from the rest. Supabase's recovery link puts a
 * real (if limited) session in the URL fragment, so by the time that page runs
 * the visitor *is* signed in — bouncing signed-in users off it, as the other
 * three routes require, made the password reset impossible to complete: the
 * page redirected to the dashboard before it could render its form, so the only
 * branch a user could ever see was "this link has expired". It is therefore
 * reachable in both states.
 */
const SIGNED_OUT_ONLY_ROUTES = ["/sign-in", "/sign-up", "/forgot-password"];
const RECOVERY_ROUTE = "/reset-password";

function matches(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

/** True for any route that does not require an established session. */
export function isPublicRoute(pathname: string): boolean {
  return (
    matches(pathname, RECOVERY_ROUTE) ||
    SIGNED_OUT_ONLY_ROUTES.some((route) => matches(pathname, route))
  );
}

/** True only for routes a signed-in user should be redirected away from. */
export function isSignedOutOnlyRoute(pathname: string): boolean {
  return SIGNED_OUT_ONLY_ROUTES.some((route) => matches(pathname, route));
}

/** True while the user is completing a password recovery. */
export function isRecoveryRoute(pathname: string): boolean {
  return matches(pathname, RECOVERY_ROUTE);
}

/**
 * Client-side route protection.
 *
 * The app is a static export, so there is no middleware to gate routes on the
 * server — the HTML shell is downloadable by anyone. That is safe because the
 * shell contains no data: every row comes from Supabase under Row Level
 * Security, so an unauthenticated visitor who loads the bundle sees an empty
 * app and nothing else. This guard is a usability boundary, not the security
 * boundary.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { configError, isLoading, session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = isPublicRoute(pathname);
  const isSignedOutOnly = isSignedOutOnlyRoute(pathname);

  useEffect(() => {
    if (isLoading || configError) return;
    if (!session && !isPublic) router.replace("/sign-in/");
    if (session && isSignedOutOnly) router.replace("/");
  }, [configError, isLoading, isPublic, isSignedOutOnly, router, session]);

  if (configError) return <ConfigErrorScreen message={configError} />;
  if (isLoading) return <FullPageLoading label="Restoring your session…" />;

  // Render nothing through the redirect rather than flashing the wrong screen.
  if (!session && !isPublic)
    return <FullPageLoading label="Redirecting to sign in…" />;
  if (session && isSignedOutOnly)
    return <FullPageLoading label="Taking you to your dashboard…" />;

  return <>{children}</>;
}
