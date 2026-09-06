import type { ReactNode } from "react";
import { MobileNav } from "./mobile-nav";
import { PageTransition } from "./page-transition";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/**
 * The application frame every page renders inside.
 *
 * Navigation adapts by breakpoint: a bottom bar on mobile, an icon rail from
 * `md`, and the full labelled sidebar from `lg`.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:ring-2 focus:ring-focus"
        href="#main-content"
      >
        Skip to main content
      </a>

      <Sidebar />

      <div className="flex min-h-dvh flex-col md:pl-[88px] lg:pl-[264px]">
        <Topbar />
        <main
          /*
           * Bottom padding clears the floating bar: its height, the gap it
           * floats in, the gesture inset, and a little breathing room — so the
           * last card in a list is never tucked under the glass.
           */
          className="flex-1 px-[max(1rem,env(safe-area-inset-left))] pt-6 pb-[calc(var(--spacing-bottom-nav)+var(--spacing-nav-inset)+env(safe-area-inset-bottom)+1.5rem)] sm:px-6 md:pb-10 lg:px-8"
          id="main-content"
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
