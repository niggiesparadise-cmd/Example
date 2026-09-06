"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isPublicRoute } from "@/features/auth/auth-guard";
import { BiometricLockGate } from "@/features/auth/biometric-lock";
import { BadgeCountsProvider } from "@/features/shared/badge-counts";
import { AppShell } from "./app-shell";

/**
 * Chooses the frame for the current route.
 *
 * Sign-in and password recovery render standalone — a sidebar and bottom bar
 * full of links you cannot use yet would be noise. Those routes are also the
 * ones the biometric lock must not cover: a user completing a password reset
 * has a session but nothing to unlock yet.
 *
 * Everything else goes through the lock first. The gate renders nothing but the
 * lock screen while locked, so no page below it mounts and no query runs.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isPublicRoute(pathname)) return <>{children}</>;
  return (
    <BiometricLockGate>
      <BadgeCountsProvider>
        <AppShell>{children}</AppShell>
      </BadgeCountsProvider>
    </BiometricLockGate>
  );
}
