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
        {/* Success and error feedback for every database write. */}
        <Toast.Provider placement="bottom end" />
      </ThemeProvider>
    </RouterProvider>
  );
}
