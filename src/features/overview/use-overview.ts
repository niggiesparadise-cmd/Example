"use client";

import { useCallback } from "react";
import { loadAnalytics, type AnalyticsData } from "@/features/analytics/api";
import { listCourses, type CourseWithProgress } from "@/features/courses/api";
import { listExams } from "@/features/exams/api";
import { listNotes } from "@/features/notes/api";
import { listEvents } from "@/features/schedule/api";
import { useQuery } from "@/features/shared/use-query";
import { listTasks } from "@/features/tasks/api";
import type { Exam, Note, ScheduleEvent, Task } from "@/lib/supabase/database.types";
import { todayIso } from "@/lib/date";

export interface OverviewData {
  courses: CourseWithProgress[];
  tasks: Task[];
  exams: Exam[];
  notes: Note[];
  todayEvents: ScheduleEvent[];
  analytics: AnalyticsData;
}

/**
 * Everything the Overview page shows, in one load.
 *
 * A single query keeps the page's states coherent: one spinner, one error, one
 * retry — rather than eight panels resolving independently and flickering.
 */
export function useOverview() {
  const run = useCallback(async (): Promise<OverviewData> => {
    const today = todayIso();
    const [courses, tasks, exams, notes, todayEvents, analytics] = await Promise.all([
      listCourses(),
      listTasks(),
      listExams(),
      listNotes(),
      listEvents(today, today),
      loadAnalytics(30),
    ]);
    return { courses, tasks, exams, notes, todayEvents, analytics };
  }, []);

  return useQuery(run, []);
}

/** True when the account has no data at all — the first-run case. */
export function isEmptyAccount(data: OverviewData): boolean {
  return (
    data.courses.length === 0 &&
    data.tasks.length === 0 &&
    data.exams.length === 0 &&
    data.notes.length === 0 &&
    data.todayEvents.length === 0
  );
}
