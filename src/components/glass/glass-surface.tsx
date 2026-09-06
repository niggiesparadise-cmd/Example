"use client";

import { cn } from "@heroui/react";
import type { ElementType, ReactNode } from "react";

/**
 * The one place a glass surface is defined.
 *
 * Everything translucent in the app is this component or one of the wrappers
 * below it — a card, a sheet, the navigation bar, a floating button. The CSS
 * lives in `globals.css` under `.glass*`; this exists so components ask for a
 * *tone* and a *radius* rather than restating a Tailwind chain, and so the day
 * the blur needs to change there is a single edit.
 */

export type GlassTone = "default" | "strong" | "subtle";
export type GlassRadius = "sm" | "md" | "lg" | "pill";

const TONE: Record<GlassTone, string> = {
  default: "glass",
  strong: "glass-strong",
  subtle: "glass-subtle",
};

const RADIUS: Record<GlassRadius, string> = {
  sm: "rounded-[var(--radius-glass-sm)]",
  md: "rounded-[var(--radius-glass)]",
  lg: "rounded-[var(--radius-glass-lg)]",
  pill: "rounded-[var(--radius-glass-pill)]",
};

export interface GlassSurfaceProps {
  children?: ReactNode;
  className?: string;
  /** How opaque the surface is. `strong` is for things that sit above content. */
  tone?: GlassTone;
  radius?: GlassRadius;
  /** Adds the lit top edge. On by default — it is most of the effect. */
  lit?: boolean;
  /** Adds the press-in transition. Only for things you can actually press. */
  interactive?: boolean;
  as?: ElementType;
}

export function GlassSurface({
  as: Component = "div",
  children,
  className,
  interactive = false,
  lit = true,
  radius = "md",
  tone = "default",
  ...rest
}: GlassSurfaceProps & Record<string, unknown>) {
  return (
    <Component
      className={cn(
        TONE[tone],
        RADIUS[radius],
        lit && "glass-lit",
        interactive && "glass-interactive",
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
