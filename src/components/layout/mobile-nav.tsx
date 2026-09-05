"use client";

import { Chip, Drawer, Separator, cn } from "@heroui/react";
import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavigation, secondaryNavigation } from "@/config/navigation";
import { useBadgeCounts } from "@/features/shared/badge-counts";
import { useAuth } from "@/features/auth/auth-provider";
import { useProfile } from "@/features/profile/use-profile";

import { NavLink, isActivePath } from "./nav-link";

/**
 * Mobile bottom navigation.
 *
 * Four sections sit in the bar; the rest live behind “More”, which opens a
 * bottom drawer. Hidden from `md` up, where the sidebar takes over.
 */
export function MobileNav() {
  const pathname = usePathname();
  const isMoreActive = secondaryNavigation.some((item) => isActivePath(pathname, item.href));
  const counts = useBadgeCounts();

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-5">
        {primaryNavigation.map((item) => {
          const isActive = isActivePath(pathname, item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex h-[4.5rem] flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
                  "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset",
                  isActive ? "text-accent" : "text-muted",
                )}
                href={item.href}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    isActive && "bg-accent-soft",
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" strokeWidth={isActive ? 2.25 : 1.85} />
                </span>
                <span className="truncate">{item.label}</span>
                {item.badgeKey && counts[item.badgeKey] > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-2.5 right-[calc(50%-1.75rem)] size-2 rounded-full bg-danger ring-2 ring-surface"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}

        <li>
          <MoreDrawer isActive={isMoreActive} />
        </li>
      </ul>
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
          "flex h-[4.5rem] w-full flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
          "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset",
          isActive ? "text-accent" : "text-muted",
        )}
      >
        <span
          className={cn(
            "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
            isActive && "bg-accent-soft",
          )}
        >
          <Ellipsis aria-hidden="true" className="size-5" strokeWidth={isActive ? 2.25 : 1.85} />
        </span>
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
                  <div className="flex items-center justify-between rounded-xl bg-surface-secondary px-3 py-2.5">
                    <span className="truncate text-sm text-foreground">
                      {profile?.full_name ?? user?.email ?? "Your account"}
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
