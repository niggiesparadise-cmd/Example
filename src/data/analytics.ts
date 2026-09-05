import type { Course } from "@/types";
import { TODAY, addDays, startOfWeek } from "@/lib/date";
import { sumBy } from "@/lib/utils";
import { courses } from "./courses";
import { studySessions } from "./study-sessions";

export interface DailyStudyPoint {
  date: string;
  minutes: number;
  /** Mean focus score across the day's sessions, 0 when nothing was logged. */
  focus: number;
}

export interface CourseStudyTotal {
  course: Course;
  minutes: number;
  /** Share of the range's total study time, 0–1. */
  share: number;
}

/** Study minutes per day across an inclusive ISO date range. */
export function dailyStudy(from: string, to: string): DailyStudyPoint[] {
  const points: DailyStudyPoint[] = [];

  for (let date = from; date <= to; date = addDays(date, 1)) {
    const onDay = studySessions.filter((session) => session.date === date);
    points.push({
      date,
      minutes: sumBy(onDay, (session) => session.minutes),
      focus: onDay.length ? Math.round(sumBy(onDay, (session) => session.focus) / onDay.length) : 0,
    });
  }

  return points;
}

/** The last `days` days of study, ending today. */
export function recentDailyStudy(days: number): DailyStudyPoint[] {
  return dailyStudy(addDays(TODAY, -(days - 1)), TODAY);
}

/** Study minutes per course across an inclusive ISO date range, largest first. */
export function studyByCourse(from: string, to: string): CourseStudyTotal[] {
  const inRange = studySessions.filter((session) => session.date >= from && session.date <= to);
  const total = sumBy(inRange, (session) => session.minutes);

  return courses
    .map((course) => {
      const minutes = sumBy(
        inRange.filter((session) => session.courseId === course.id),
        (session) => session.minutes,
      );
      return { course, minutes, share: total === 0 ? 0 : minutes / total };
    })
    .sort((a, b) => b.minutes - a.minutes);
}

/** Total study minutes in an inclusive ISO date range. */
export function studyMinutesBetween(from: string, to: string): number {
  return sumBy(
    studySessions.filter((session) => session.date >= from && session.date <= to),
    (session) => session.minutes,
  );
}

/** This week's study minutes against last week's, for the headline delta. */
export function weekOverWeekStudy(): { current: number; previous: number; change: number } {
  const thisMonday = startOfWeek(TODAY);
  const lastMonday = addDays(thisMonday, -7);

  const current = studyMinutesBetween(thisMonday, TODAY);
  // Compare like with like: the same number of elapsed days a week earlier.
  const previous = studyMinutesBetween(lastMonday, addDays(TODAY, -7));

  return {
    current,
    previous,
    change: previous === 0 ? 0 : (current - previous) / previous,
  };
}

/** Consecutive days up to today with at least one logged session. */
export function studyStreak(): number {
  let streak = 0;
  for (let date = TODAY; ; date = addDays(date, -1)) {
    const studied = studySessions.some((session) => session.date === date && session.minutes > 0);
    if (!studied) break;
    streak += 1;
    if (streak > 365) break;
  }
  return streak;
}

/** Mean focus score across the last `days` days that had any sessions logged. */
export function averageFocus(days: number): number {
  const points = recentDailyStudy(days).filter((point) => point.minutes > 0);
  if (points.length === 0) return 0;
  return Math.round(sumBy(points, (point) => point.focus) / points.length);
}
