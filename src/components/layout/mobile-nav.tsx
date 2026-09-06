"use client";

import { Chip, Drawer, Separator, cn } from "@heroui/react";
import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { GlassSurface } from "@/components/glass/glass-surface";
import { primaryNavigation, secondaryNavigation } from "@/config/navigation";
import { useBadgeCounts } from "@/features/shared/badge-counts";
import { useAuth } from "@/features/auth/auth-provider";
import { UserAvatar } from "@/features/profile/user-avatar";
import { useProfile } from "@/features/profile/use-profile";

import { NavLink, isActivePath } from "./nav-link";

/**
 * The floating bottom navigation.
 *
 * A detached pill rather than a full-width bar: it sits clear of the screen
 * edges, above the gesture area, and lets the page scroll visibly underneath —
 * which is the whole reason it is glass. Hidden from `md` up, where the sidebar
 * takes over.
 *
 * The active item is marked by a single pill that *moves* between slots rather
 * than five highlights fading in and out. One element animating on `transform`
 * is cheaper than five animating on `background-color`, and the movement is
 * what makes the change legible at a glance.
 */
export function MobileNav() {
  const pathname = usePathname();
  const isMoreActive = secondaryNavigation.some((item) => isActivePath(pathname, item.href));
  const counts = useBadgeCounts();

  const listRef = useRef<HTMLUListElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  const activeIndex = isMoreActive
    ? primaryNavigation.length
    : primaryNavigation.findIndex((item) => isActivePath(pathname, item.href));

  /*
   * Measure the active slot and move the pill onto it.
   *
   * `useLayoutEffect` so the pill is in place before the browser paints —
   * measuring in a passive effect makes it visibly jump on first render. It
   * reads geometry rather than assuming equal widths, so the bar survives a
   * label of a different length or a narrower phone.
   */
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || activeIndex < 0) {
      setIndicator(null);
      return;
    }

    const measure = () => {
      /*
       * Query the slots by attribute rather than indexing into `children`: the
       * indicator is itself a child of this list, so once it renders every
       * positional index shifts by one and the pill settles under the item
       * *before* the active one.
       */
      const slots = list.querySelectorAll<HTMLElement>("[data-nav-slot]");
      const slot = slots[activeIndex];
      if (!slot) return;
      setIndicator({ left: slot.offsetLeft, width: slot.offsetWidth });
    };

    measure();

    // Rotation and the on-screen keyboard both resize the bar.
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [activeIndex]);

  return (
    <nav
      /*
       * A different landmark name from the sidebar's "Sections". Only one of
       * the two is ever visible, but both are in the DOM, and two navigation
       * landmarks with the same name is a confusing thing to meet when you are
       * moving through a page by landmark.
       */
      aria-label="Primary sections"
      className={cn(
        "fixed inset-x-0 z-30 flex justify-center px-3 md:hidden",
        // Clear of the gesture bar, not flush against it.
        "bottom-[calc(env(safe-area-inset-bottom)+var(--spacing-nav-inset))]",
      )}
    >
      <GlassSurface
        className="w-full max-w-md overflow-hidden"
        radius="pill"
        tone="strong"
      >
        <ul className="relative grid grid-cols-5" ref={listRef}>
          {/* The moving highlight, behind the items. */}
          {indicator ? (
            <li
              aria-hidden="true"
              className="glass-indicator pointer-events-none absolute top-1.5 bottom-1.5 rounded-[var(--radius-glass-pill)] bg-accent-soft"
              style={{
                transform: `translate3d(${indicator.left}px, 0, 0)`,
                width: indicator.width,
              }}
            />
          ) : null}

          {primaryNavigation.map((item) => {
            const isActive = isActivePath(pathname, item.href);
            const Icon = item.icon;

            return (
              <li className="relative" data-nav-slot key={item.href}>
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
                    "rounded-[var(--radius-glass-pill)] outline-none",
                    "transition-[color,transform] duration-[var(--duration-glass)] ease-[var(--ease-glass)]",
                    "focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset",
                    isActive ? "text-accent" : "text-muted",
                  )}
                  href={item.href}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      "size-5 transition-transform duration-[var(--duration-glass)] ease-[var(--ease-glass)]",
                      isActive && "-translate-y-px scale-110",
                    )}
                    strokeWidth={isActive ? 2.3 : 1.85}
                  />
                  <span
                    className={cn(
                      "truncate transition-opacity duration-[var(--duration-glass)]",
                      isActive ? "opacity-100" : "opacity-80",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.badgeKey && counts[item.badgeKey] > 0 ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-2 right-[calc(50%-1.4rem)] size-2 rounded-full bg-danger ring-2 ring-[var(--glass-fallback)]"
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}

          <li className="relative" data-nav-slot>
            <MoreDrawer isActive={isMoreActive} />
          </li>
        </ul>
      </GlassSurface>
    </nav>
  );
}

function MoreDrawer({ isActive }: { isActive: boolean }) {
  const { data: profile } = useProfile();
  const { user } = useAuth();

  return (
    <Drawer>
      <Drawer.Trigger
        className={cn(
          "flex h-16 w-full flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
          "rounded-[var(--radius-glass-pill)] outline-none",
          "transition-colors duration-[var(--duration-glass)] ease-[var(--ease-glass)]",
          "focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset",
          isActive ? "text-accent" : "text-muted",
        )}
      >
        <Ellipsis
          aria-hidden="true"
          className={cn(
            "size-5 transition-transform duration-[var(--duration-glass)] ease-[var(--ease-glass)]",
            isActive && "-translate-y-px scale-110",
          )}
          strokeWidth={isActive ? 2.3 : 1.85}
        />
        <span>More</span>
      </Drawer.Trigger>

      <Drawer.Backdrop>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog>
            {({ close }) => (
              <>
                <Drawer.Handle />
                <Drawer.Header>
                  <Drawer.Heading>All sections</Drawer.Heading>
                  <p className="text-sm text-muted">{profile?.term ?? "Study dashboard"}</p>
                </Drawer.Header>
                <Drawer.Body>
                  <ul className="flex flex-col gap-1 pb-2">
                    {primaryNavigation.map((item) => (
                      <li key={item.href}>
                        <NavLink item={item} layout="list" onNavigate={close} />
                      </li>
                    ))}
                    <li aria-hidden="true" className="py-1">
                      <Separator />
                    </li>
                    {secondaryNavigation.map((item) => (
                      <li key={item.href}>
                        <NavLink item={item} layout="list" onNavigate={close} />
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between gap-3 rounded-[var(--radius-glass)] bg-surface-secondary px-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <UserAvatar size="sm" />
                      <span className="truncate text-sm text-foreground">
                        {profile?.full_name ?? user?.email ?? "Your account"}
                      </span>
                    </span>
                    {profile?.program ? (
                      <Chip size="sm" variant="soft">
                        {profile.program}
                      </Chip>
                    ) : null}
                  </div>
                </Drawer.Body>
              </>
            )}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
