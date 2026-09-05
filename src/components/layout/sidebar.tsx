"use client";

import { Separator } from "@heroui/react";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { navigation } from "@/config/navigation";
import { site } from "@/config/site";
import { useProfile } from "@/features/profile/use-profile";
import { NavLink } from "./nav-link";

/**
 * Desktop and tablet navigation.
 *
 * Fixed to the viewport, it collapses from a 264px labelled column to an 88px
 * icon rail below `lg`, and is replaced entirely by the bottom bar on mobile.
 */
export function Sidebar() {
  const { data: profile } = useProfile();

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
            <span className="block text-xs text-muted">{profile?.term ?? "Study dashboard"}</span>
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
        <p className="truncate text-sm font-medium text-foreground">{profile?.full_name ?? "Your account"}</p>
        <p className="truncate text-xs text-muted">{profile?.program ?? "Add your programme in Settings"}</p>
      </div>

    </aside>
  );
}
