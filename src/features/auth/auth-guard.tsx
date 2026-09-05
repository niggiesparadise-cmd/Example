"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { ConfigErrorScreen, FullPageLoading } from "@/components/ui/data-states";
import { useAuth } from "./auth-provider";

/** Routes reachable without a session. Everything else requires one. */
const PUBLIC_ROUTES = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password"];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
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

  useEffect(() => {
    if (isLoading || configError) return;
    if (!session && !isPublic) router.replace("/sign-in/");
    if (session && isPublic) router.replace("/");
  }, [configError, isLoading, isPublic, router, session]);

  if (configError) return <ConfigErrorScreen message={configError} />;
  if (isLoading) return <FullPageLoading label="Restoring your session…" />;

  // Render nothing through the redirect rather than flashing the wrong screen.
  if (!session && !isPublic) return <FullPageLoading label="Redirecting to sign in…" />;
  if (session && isPublic) return <FullPageLoading label="Taking you to your dashboard…" />;

  return <>{children}</>;
}
