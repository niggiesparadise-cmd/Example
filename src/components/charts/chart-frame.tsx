"use client";

import { Skeleton, cn } from "@heroui/react";
import type { ReactNode } from "react";

interface ChartFrameProps {
  /** Minimum plot height in pixels — reserved before the chart renders, so nothing jumps. */
  height: number;
  isReady: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Reserves a chart's space and shows a skeleton until the palette is known.
 *
 * Charts need the resolved theme to pick their colours, which is only available
 * after hydration; holding the height here keeps the layout still and stops a
 * dark-mode reader seeing a flash of the light palette.
 *
 * The absolutely positioned inner box is load-bearing: Recharts' responsive
 * container sizes itself with `height: 100%`, which resolves to nothing against
 * a parent whose own height is `auto` — `min-height` alone does not make a
 * percentage resolve. Positioning against the outer box gives it a real height
 * whether the card is stretched by its grid row or sized by its content.
 */
export function ChartFrame({ children, className, height, isReady }: ChartFrameProps) {
  return (
    <div className={cn("relative w-full flex-1", className)} style={{ minHeight: height }}>
      <div className="absolute inset-0">
        {isReady ? children : <Skeleton className="size-full rounded-xl" />}
      </div>
    </div>
  );
}
