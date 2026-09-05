import type { ColorSlot } from "@/types";

/**
 * The chart palette, mirrored from `globals.css`.
 *
 * Recharts needs real colour values (a `var()` in an SVG presentation attribute
 * is not reliably resolved), so the hexes live here as well as in CSS. The two
 * lists must stay in step — they are the same validated palette.
 *
 * Validation (surfaces #ffffff light, #18181b dark, adjacent pairs):
 *   light — worst CVD ΔE 9.1, worst normal-vision ΔE 19.6
 *   dark  — worst CVD ΔE 8.4, worst normal-vision ΔE 19.3
 * Three light-mode slots sit under 3:1 against white, so every chart using them
 * carries visible labels or a table view rather than relying on colour alone.
 */
export interface ChartPalette {
  /** Categorical slots, indexed by `ColorSlot - 1`. */
  series: readonly [string, string, string, string, string];
  /** Hairline gridlines, one step off the surface. */
  grid: string;
  /** Axis rule and ticks. */
  axis: string;
  /** Axis and annotation text. */
  muted: string;
  /** The daily-goal reference line. */
  goal: string;
  /** Surface the chart is drawn on — also the colour of mark gaps and rings. */
  surface: string;
}

export const lightPalette: ChartPalette = {
  series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"],
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  muted: "#898781",
  goal: "#898781",
  surface: "#ffffff",
};

export const darkPalette: ChartPalette = {
  series: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"],
  grid: "#2c2c2a",
  axis: "#383835",
  muted: "#898781",
  goal: "#898781",
  surface: "#18181b",
};

/**
 * Tailwind classes per colour slot, written out in full so the compiler can
 * see them — a template literal like `bg-course-${n}` would never be generated.
 */
export const courseDotClass: Record<ColorSlot, string> = {
  1: "bg-course-1",
  2: "bg-course-2",
  3: "bg-course-3",
  4: "bg-course-4",
  5: "bg-course-5",
};
