"use client";

import { cn } from "@heroui/react";
import type { ReactNode } from "react";
import { GlassSurface, type GlassTone } from "./glass-surface";

/**
 * A content card in glass.
 *
 * Deliberately not a replacement for HeroUI's `Card`: the existing pages keep
 * using that where a plain opaque panel is the right answer. This is for the
 * cards that want to read as floating — the dashboard's feature tiles, a
 * result screen, a flashcard.
 */
export function GlassCard({
  children,
  className,
  footer,
  header,
  interactive = false,
  padded = true,
  tone = "default",
}: {
  children?: ReactNode;
  className?: string;
  footer?: ReactNode;
  header?: ReactNode;
  interactive?: boolean;
  padded?: boolean;
  tone?: GlassTone;
}) {
  return (
    <GlassSurface
      className={cn("flex flex-col", padded && "p-4 sm:p-5", className)}
      interactive={interactive}
      tone={tone}
    >
      {header ? <div className="mb-3 flex items-center justify-between gap-3">{header}</div> : null}
      {children}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </GlassSurface>
  );
}

/** The small stat tile used on the dashboard for the new sections. */
export function GlassStat({
  caption,
  href,
  icon,
  label,
  value,
}: {
  caption?: string;
  href?: string;
  icon?: ReactNode;
  label: string;
  value: ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-xs font-medium text-muted">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="tabular mt-2 font-display text-2xl leading-none font-semibold text-foreground">{value}</p>
      {caption ? <p className="mt-1.5 text-xs text-muted">{caption}</p> : null}
    </>
  );

  if (href) {
    return (
      <GlassSurface
        as="a"
        className="block p-4 no-underline outline-none focus-visible:ring-2 focus-visible:ring-focus"
        href={href}
        interactive
      >
        {body}
      </GlassSurface>
    );
  }
  return <GlassSurface className="p-4">{body}</GlassSurface>;
}
