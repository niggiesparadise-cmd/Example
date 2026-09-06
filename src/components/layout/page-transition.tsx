"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * The section-change transition.
 *
 * Keying a wrapper on the pathname makes React discard the old subtree and
 * mount a new one, which restarts the CSS animation — no library, no state
 * machine, no transition group. The animation itself is `opacity` and
 * `translate3d` only: both are composited, so switching sections never triggers
 * layout, and the whole thing collapses to nothing under
 * `prefers-reduced-motion` (handled in `globals.css`).
 *
 * Only the page body moves. The navigation, the top bar and the app frame stay
 * put — that continuity is what makes it read as one app rather than a reload.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="page-enter" key={pathname}>
      {children}
    </div>
  );
}
