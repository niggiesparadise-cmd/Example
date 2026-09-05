/**
 * Date helpers for the dashboard.
 *
 * Everything is computed in UTC so the server and the browser always agree —
 * a `new Date()` read on each side would otherwise render different weekdays
 * either side of midnight and break hydration.
 */

/**
 * Today, in the user's own timezone.
 *
 * This used to be a frozen constant so the mock dataset rendered deterministically.
 * With real data there is nothing to pin: every screen that calls this renders
 * only after the auth guard has resolved on the client, so there is no server
 * render to disagree with.
 */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Local calendar date of a `Date`, as `YYYY-MM-DD` (not UTC-shifted). */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Parse an ISO `YYYY-MM-DD` string into a UTC-midnight `Date`. */
export function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** Format a `Date` back into an ISO `YYYY-MM-DD` string. */
export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Shift an ISO date by a whole number of days. */
export function addDays(iso: string, days: number): string {
  const date = parseDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

/** Whole days from `from` to `to`; negative when `to` is in the past. */
export function daysBetween(from: string, to: string): number {
  const ms = parseDate(to).getTime() - parseDate(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** Whole days from today until `iso`; negative when `iso` is in the past. */
export function daysUntil(iso: string): number {
  return daysBetween(todayIso(), iso);
}

/** Day of the week for an ISO date, 0 = Sunday. */
export function weekdayOf(iso: string): number {
  return parseDate(iso).getUTCDay();
}

/** The ISO date of the Monday on or before `iso`. */
export function startOfWeek(iso: string): string {
  const day = weekdayOf(iso);
  return addDays(iso, day === 0 ? -6 : 1 - day);
}

function format(iso: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(parseDate(iso));
}

/** e.g. `"16 Sep"`. */
export function formatDayMonth(iso: string): string {
  return format(iso, { day: "numeric", month: "short" });
}

/** e.g. `"Wednesday, 16 September"`. */
export function formatLongDate(iso: string): string {
  return format(iso, { weekday: "long", day: "numeric", month: "long" });
}

/** e.g. `"Wed 16 Sep"`. */
export function formatShortDate(iso: string): string {
  return format(iso, { weekday: "short", day: "numeric", month: "short" });
}

/** Three-letter weekday, e.g. `"Wed"`. */
export function formatWeekday(iso: string): string {
  return format(iso, { weekday: "short" });
}

/**
 * A short human label for a date near today: `"Today"`, `"Tomorrow"`,
 * `"Yesterday"`, a weekday within the coming week, otherwise `"16 Sep"`.
 */
export function relativeDayLabel(iso: string): string {
  const delta = daysUntil(iso);
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  if (delta > 1 && delta < 7) return format(iso, { weekday: "long" });
  return formatDayMonth(iso);
}

/** Convert `"14:30"` to minutes past midnight. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Render `"14:30"` as `"2:30 pm"`. */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours < 12 ? "am" : "pm";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/** Minutes between two `"HH:MM"` times. */
export function durationMinutes(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start);
}
