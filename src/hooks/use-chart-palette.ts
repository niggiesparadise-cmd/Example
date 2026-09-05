"use client";

import { useIsHydrated } from "@heroui/react";
import { useTheme } from "next-themes";
import { darkPalette, lightPalette, type ChartPalette } from "@/lib/chart-palette";

/**
 * The chart palette for the active theme.
 *
 * `isReady` is false during SSR and the first render, when the resolved theme
 * is not yet known — charts render a skeleton of the same height until then, so
 * a dark-mode reader never sees a flash of the light palette.
 */
export function useChartPalette(): { palette: ChartPalette; isReady: boolean } {
  const { resolvedTheme } = useTheme();
  const isHydrated = useIsHydrated();

  return {
    palette: resolvedTheme === "dark" ? darkPalette : lightPalette,
    isReady: isHydrated && resolvedTheme !== undefined,
  };
}
