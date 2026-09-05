import { CalendarCheck, Clock, Flame, ListChecks } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import type { AnalyticsSummary } from "@/features/analytics/api";
import type { Task } from "@/lib/supabase/database.types";
import { addDays, todayIso } from "@/lib/date";
import { formatDuration, formatPercent, formatSigned, minutesToHours } from "@/lib/format";

/**
 * The KPI row, computed from the user's own rows.
 *
 * Every figure here traces to a `study_sessions` or `tasks` row. With no data
 * they read zero rather than showing a plausible-looking placeholder.
 */
export function OverviewStats({
  dailyMinutes,
  summary,
  tasks,
}: {
  dailyMinutes: number[];
  summary: AnalyticsSummary;
  tasks: Task[];
}) {
  const today = todayIso();
  const weekEnd = addDays(today, 6);
  const dueThisWeek = tasks.filter(
    (task) => task.due_date !== null && task.due_date >= today && task.due_date <= weekEnd,
  );
  const doneThisWeek = dueThisWeek.filter((task) => task.status === "done").length;
  const changePercent = Math.round(summary.weekChange * 100);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        delta={
          summary.previousWeekMinutes > 0
            ? {
                label: `${formatSigned(changePercent)}%`,
                direction: changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat",
                period: "vs the same days last week",
                upIsGood: true,
              }
            : undefined
        }
        caption={summary.previousWeekMinutes === 0 ? "No history to compare yet" : undefined}
        icon={<Clock aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
        label="Studied this week"
        trend={dailyMinutes.length > 1 ? dailyMinutes.slice(-12).map(minutesToHours) : undefined}
        value={formatDuration(summary.weekMinutes)}
      />

      <StatCard
        caption={dueThisWeek.length === 0 ? "Nothing due in the next 7 days" : `${doneThisWeek} of ${dueThisWeek.length} completed`}
        icon={<CalendarCheck aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
        label="Due this week"
        meter={
          dueThisWeek.length > 0
            ? {
                label: `${doneThisWeek} of ${dueThisWeek.length} tasks completed this week`,
                value: (doneThisWeek / dueThisWeek.length) * 100,
              }
            : undefined
        }
        unit={dueThisWeek.length === 1 ? "task" : "tasks"}
        value={String(dueThisWeek.length)}
      />

      <StatCard
        caption={summary.streak === 0 ? "Log a study session to start one" : "Consecutive days studied"}
        icon={<Flame aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
        label="Study streak"
        unit={summary.streak === 1 ? "day" : "days"}
        value={String(summary.streak)}
      />

      <StatCard
        caption={
          summary.tasksTotal === 0
            ? "No tasks yet"
            : `${summary.tasksCompleted} of ${summary.tasksTotal} tasks done`
        }
        icon={<ListChecks aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
        label="Task completion"
        value={summary.tasksTotal === 0 ? "—" : formatPercent(summary.completionRate)}
      />
    </div>
  );
}
