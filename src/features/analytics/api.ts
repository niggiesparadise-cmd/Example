import type { Course, StudySession, Task } from "@/lib/supabase/database.types";
import { addDays, toIsoDate } from "@/lib/date";
import { getSupabase, unwrap } from "../shared/api";

/**
 * Analytics, computed from the user's own rows.
 *
 * Nothing here is generated or estimated: every figure traces back to a
 * `study_sessions`, `tasks` or `courses` row the user created. Where there is no
 * data the honest answer is zero, and the UI shows an empty state rather than a
 * plausible-looking number.
 */

export interface DailyStudyPoint {
  date: string;
  minutes: number;
  /** Mean focus score for the day, or 0 when none was recorded. */
  focus: number;
}

export interface CourseStudyTotal {
  course: Course;
  minutes: number;
  /** Share of the range's total, 0–1. */
  share: number;
}

export interface AnalyticsSummary {
  totalMinutes: number;
  weekMinutes: number;
  previousWeekMinutes: number;
  /** Fractional change week over week; 0 when there is no baseline. */
  weekChange: number;
  tasksCompleted: number;
  tasksTotal: number;
  /** Completion rate 0–1, or 0 with no tasks. */
  completionRate: number;
  /** Consecutive days ending today with at least one logged session. */
  streak: number;
  /** Mean focus across sessions that recorded one. */
  averageFocus: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  daily: DailyStudyPoint[];
  byCourse: CourseStudyTotal[];
}

function minutesOf(session: StudySession): number {
  return session.duration_minutes ?? 0;
}

/** Local calendar date for a timestamp, so "today" means the user's today. */
function localDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Loads everything the analytics views need in one pass.
 *
 * `days` bounds the daily series; totals cover the same window so the headline
 * figures and the chart can never tell different stories.
 */
export async function loadAnalytics(days = 30): Promise<AnalyticsData> {
  const supabase = getSupabase();
  const today = toIsoDate(new Date());
  const from = addDays(today, -(days - 1));

  const [sessionsResult, tasksResult, coursesResult] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("*")
      .not("ended_at", "is", null)
      .gte("started_at", `${from}T00:00:00.000Z`),
    supabase.from("tasks").select("*"),
    supabase.from("courses").select("*"),
  ]);

  const sessions = unwrap(sessionsResult);
  const tasks: Task[] = unwrap(tasksResult);
  const courses: Course[] = unwrap(coursesResult);

  // ---- daily series (every day present, including zero days)
  const byDay = new Map<string, { minutes: number; focusTotal: number; focusCount: number }>();
  for (const session of sessions) {
    const key = localDate(session.started_at);
    const bucket = byDay.get(key) ?? { minutes: 0, focusTotal: 0, focusCount: 0 };
    bucket.minutes += minutesOf(session);
    if (session.focus !== null) {
      bucket.focusTotal += session.focus;
      bucket.focusCount += 1;
    }
    byDay.set(key, bucket);
  }

  const daily: DailyStudyPoint[] = [];
  for (let index = 0; index < days; index += 1) {
    const date = addDays(from, index);
    const bucket = byDay.get(date);
    daily.push({
      date,
      minutes: bucket?.minutes ?? 0,
      focus: bucket && bucket.focusCount > 0 ? Math.round(bucket.focusTotal / bucket.focusCount) : 0,
    });
  }

  // ---- per-course totals
  const courseMinutes = new Map<string, number>();
  for (const session of sessions) {
    if (!session.course_id) continue;
    courseMinutes.set(session.course_id, (courseMinutes.get(session.course_id) ?? 0) + minutesOf(session));
  }
  const totalMinutes = sessions.reduce((sum, session) => sum + minutesOf(session), 0);
  const byCourse: CourseStudyTotal[] = courses
    .map((course) => {
      const minutes = courseMinutes.get(course.id) ?? 0;
      return { course, minutes, share: totalMinutes === 0 ? 0 : minutes / totalMinutes };
    })
    .sort((a, b) => b.minutes - a.minutes);

  // ---- week over week, comparing the same number of elapsed days
  const weekStart = startOfWeek(today);
  const previousWeekStart = addDays(weekStart, -7);
  const sumBetween = (start: string, end: string) =>
    sessions
      .filter((session) => {
        const date = localDate(session.started_at);
        return date >= start && date <= end;
      })
      .reduce((sum, session) => sum + minutesOf(session), 0);

  const weekMinutes = sumBetween(weekStart, today);
  const previousWeekMinutes = sumBetween(previousWeekStart, addDays(today, -7));

  // ---- streak
  let streak = 0;
  for (let cursor = today; ; cursor = addDays(cursor, -1)) {
    if ((byDay.get(cursor)?.minutes ?? 0) <= 0) break;
    streak += 1;
    if (streak > days) break;
  }

  const withFocus = sessions.filter((session) => session.focus !== null);
  const tasksCompleted = tasks.filter((task) => task.status === "done").length;

  return {
    summary: {
      totalMinutes,
      weekMinutes,
      previousWeekMinutes,
      weekChange: previousWeekMinutes === 0 ? 0 : (weekMinutes - previousWeekMinutes) / previousWeekMinutes,
      tasksCompleted,
      tasksTotal: tasks.length,
      completionRate: tasks.length === 0 ? 0 : tasksCompleted / tasks.length,
      streak,
      averageFocus:
        withFocus.length === 0
          ? 0
          : Math.round(withFocus.reduce((sum, s) => sum + (s.focus ?? 0), 0) / withFocus.length),
    },
    daily,
    byCourse,
  };
}

/** Monday on or before `iso`. */
function startOfWeek(iso: string): string {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return addDays(iso, day === 0 ? -6 : 1 - day);
}
