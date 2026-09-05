"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isPublicRoute } from "@/features/auth/auth-guard";
import { BadgeCountsProvider } from "@/features/shared/badge-counts";
import { AppShell } from "./app-shell";

/**
 * Chooses the frame for the current route.
 *
 * Sign-in and password recovery render standalone — a sidebar and bottom bar
 * full of links you cannot use yet would be noise.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isPublicRoute(pathname)) return <>{children}</>;
  return (
    <BadgeCountsProvider>
      <AppShell>{children}</AppShell>
    </BadgeCountsProvider>
  );
}
