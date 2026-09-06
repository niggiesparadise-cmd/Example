"use client";

import { RouterProvider, Toast } from "@heroui/react";
import { ThemeProvider } from "next-themes";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * App-wide providers.
 *
 * HeroUI v3 needs no provider of its own, but two things are wired up here:
 * `RouterProvider` hands React Aria's `href` navigation to the Next router, so
 * HeroUI links and buttons do client-side transitions; `ThemeProvider` writes
 * both the `dark` class and `data-theme`, the two selectors HeroUI's theme
 * responds to.
 */
export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <RouterProvider navigate={(href) => router.push(href)}>
      <ThemeProvider
        attribute={["class", "data-theme"]}
        defaultTheme="system"
        disableTransitionOnChange
        enableSystem
      >
        {children}
        {/*
          Success and error feedback for every database write.

          The bottom offset clears the mobile navigation bar and the gesture
          inset: at the default placement the toast sat directly on top of the
          bottom bar and intercepted taps meant for it, so a toast could leave
          the navigation unusable for as long as it was on screen.
        */}
        <Toast.Provider
          className="bottom-[calc(var(--spacing-bottom-nav)+env(safe-area-inset-bottom)+0.75rem)] md:bottom-4"
          placement="bottom end"
        />
      </ThemeProvider>
    </RouterProvider>
  );
}
