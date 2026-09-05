/** Number, duration and grade formatting shared across the dashboard. */

/** `95` → `"1h 35m"`, `120` → `"2h"`, `45` → `"45m"`. */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

/** `95` → `"1.6"` — hours to one decimal, for axes and compact labels. */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

/** `0.08` → `"+0.08"`, `-3` → `"−3"` (true minus sign, not a hyphen). */
export function formatSigned(value: number, fractionDigits = 0): string {
  const magnitude = Math.abs(value).toFixed(fractionDigits);
  if (value > 0) return `+${magnitude}`;
  if (value < 0) return `−${magnitude}`;
  return magnitude;
}

/** `0.123` → `"12%"`. Pass a ratio, not a percentage. */
export function formatPercent(ratio: number, fractionDigits = 0): string {
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}

/** `1284` → `"1,284"`. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}
