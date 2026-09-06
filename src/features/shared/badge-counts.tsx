"use client";

import { createContext, use, useMemo, type ReactNode } from "react";
import { countPendingInvitations } from "@/features/challenges/api";
import { listExams } from "@/features/exams/api";
import { listTasks } from "@/features/tasks/api";
import { useDataVersion } from "@/features/shared/data-version";
import { useQuery } from "@/features/shared/use-query";
import { addDays, todayIso } from "@/lib/date";

export interface BadgeCounts {
  tasks: number;
  exams: number;
  /** Invitations addressed to you and not yet answered. */
  challenges: number;
}

const BadgeCountsContext = createContext<BadgeCounts>({ tasks: 0, exams: 0, challenges: 0 });

/**
 * Live counts for the navigation badges.
 *
 * Previously these were constants derived from the mock dataset. They now come
 * from the user's own rows: open tasks due within a week, and assessments in the
 * next fortnight.
 */
export function BadgeCountsProvider({ children }: { children: ReactNode }) {
  // This provider lives in the app frame, which navigation never remounts, so
  // without the version dependency the badges froze at their first-load values.
  const dataVersion = useDataVersion();
  const tasks = useQuery(listTasks, [dataVersion]);
  const exams = useQuery(listExams, [dataVersion]);
  const invitations = useQuery(countPendingInvitations, [dataVersion]);

  const value = useMemo<BadgeCounts>(() => {
    const today = todayIso();
    const weekOut = addDays(today, 7);
    const fortnightOut = addDays(today, 14);

    return {
      tasks: (tasks.data ?? []).filter(
        (task) => task.status !== "done" && task.due_date !== null && task.due_date <= weekOut,
      ).length,
      exams: (exams.data ?? []).filter((exam) => exam.exam_date >= today && exam.exam_date <= fortnightOut)
        .length,
      challenges: invitations.data ?? 0,
    };
  }, [tasks.data, exams.data, invitations.data]);

  return <BadgeCountsContext value={value}>{children}</BadgeCountsContext>;
}

export function useBadgeCounts(): BadgeCounts {
  return use(BadgeCountsContext);
}
