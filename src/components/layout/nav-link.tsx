"use client";

import { Chip, cn } from "@heroui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/config/navigation";

/** Whether `href` is the active section for the current path. */
export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

interface NavLinkProps {
  item: NavItem;
  /**
   * `rail` stacks a small label under the icon for the tablet sidebar;
   * `full` is the wide desktop row; `list` is the mobile drawer row.
   */
  layout?: "auto" | "list";
  onNavigate?: () => void;
}

/**
 * A sidebar row: icon, label and an optional count badge.
 *
 * In `auto` layout the same markup is the tablet rail (icon over a small label)
 * and the desktop row (icon beside the label) — the switch is pure CSS, so the
 * server and the client render identically and nothing shifts on hydration.
 */
export function NavLink({ item, layout = "auto", onNavigate }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = isActivePath(pathname, item.href);
  const Icon = item.icon;
  const isList = layout === "list";

  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl text-sm font-medium",
        "outline-none transition-colors duration-150",
        "focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        isList
          ? "px-3 py-3"
          : "px-3 py-2.5 max-lg:flex-col max-lg:gap-1 max-lg:px-1 max-lg:py-2.5",
        isActive
          ? "bg-accent-soft text-accent-soft-foreground"
          : "text-muted hover:bg-surface-secondary hover:text-foreground",
      )}
      href={item.href}
      onClick={onNavigate}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-5 shrink-0", isActive ? "text-accent" : "text-muted group-hover:text-foreground")}
        strokeWidth={isActive ? 2.25 : 1.85}
      />
      <span
        className={cn(
          "truncate",
          isList ? "flex-1" : "flex-1 max-lg:w-full max-lg:flex-none max-lg:text-center max-lg:text-[11px] max-lg:leading-tight",
        )}
      >
        {item.label}
      </span>
      {isList ? (
        <span className="text-xs text-muted">{item.description}</span>
      ) : null}
      {item.badge ? (
        <Chip
          className={cn(!isList && "max-lg:absolute max-lg:top-1.5 max-lg:right-2.5")}
          color={isActive ? "accent" : "default"}
          size="sm"
          variant="soft"
        >
          {item.badge}
        </Chip>
      ) : null}
    </Link>
  );
}
