"use client";

import { ProgressBar, Separator } from "@heroui/react";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { navigation } from "@/config/navigation";
import { site } from "@/config/site";
import { student } from "@/data";
import { NavLink } from "./nav-link";

/**
 * Desktop and tablet navigation.
 *
 * Fixed to the viewport, it collapses from a 264px labelled column to an 88px
 * icon rail below `lg`, and is replaced entirely by the bottom bar on mobile.
 */
export function Sidebar() {
  const weekProgress = Math.round((student.currentWeek / student.totalWeeks) * 100);

  return (
    <aside
      aria-label="Main navigation"
      className="fixed inset-y-0 left-0 z-30 hidden w-[88px] flex-col border-r border-border bg-surface pt-[env(safe-area-inset-top)] md:flex lg:w-[264px]"
    >
      <div className="flex h-16 items-center gap-2.5 px-4 max-lg:justify-center max-lg:px-0">
        <Link
          aria-label={`${site.name} — ${site.tagline}`}
          className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          href="/"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <GraduationCap aria-hidden="true" className="size-5" strokeWidth={2} />
          </span>
          <span className="max-lg:hidden">
            <span className="block font-display text-lg leading-none font-semibold text-foreground">
              {site.name}
            </span>
            <span className="block text-xs text-muted">{student.term}</span>
          </span>
        </Link>
      </div>

      <Separator className="mx-4 max-lg:mx-3" />

      <nav aria-label="Sections" className="flex-1 overflow-y-auto px-3 py-4 max-lg:px-2">
        <ul className="flex flex-col gap-1">
          {navigation.map((item) => (
            <li key={item.href}>
              <NavLink item={item} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border p-4 max-lg:hidden">
        <ProgressBar
          aria-label={`Term progress: week ${student.currentWeek} of ${student.totalWeeks}`}
          size="sm"
          value={weekProgress}
        >
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-foreground">
              Week {student.currentWeek} of {student.totalWeeks}
            </span>
            <ProgressBar.Output className="tabular text-xs text-muted" />
          </div>
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
        <p className="mt-2 text-xs text-muted">{student.program}</p>
      </div>
    </aside>
  );
}
