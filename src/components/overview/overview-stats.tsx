import { CalendarCheck, Clock, Flame, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import {
  averageFocus,
  recentDailyStudy,
  student,
  studyStreak,
  tasksDueBetween,
  weekOverWeekStudy,
} from "@/data";
import { TODAY, addDays, startOfWeek } from "@/lib/date";
import { formatDuration, formatSigned, minutesToHours } from "@/lib/format";

/**
 * The dashboard's KPI row.
 *
 * Four stat tiles rather than a chart apiece: each of these is a single current
 * value, and a one-bar chart would say less in more space.
 */
export function OverviewStats() {
  const week = weekOverWeekStudy();
  const trend = recentDailyStudy(12).map((point) => minutesToHours(point.minutes));

  const weekStart = startOfWeek(TODAY);
  const weekEnd = addDays(weekStart, 6);
  const dueThisWeek = tasksDueBetween(weekStart, weekEnd);
  const completedThisWeek = dueThisWeek.filter((task) => task.status === "done").length;

  const streak = studyStreak();
  const focus = averageFocus(14);
  const changePercent = Math.round(week.change * 100);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        delta={{
          label: `${formatSigned(changePercent)}%`,
          direction: changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat",
          period: "vs the same days last week",
          upIsGood: true,
        }}
        icon={<Clock aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
        label="Studied this week"
        trend={trend}
        value={formatDuration(week.current)}
      />

      <StatCard
        caption={`${completedThisWeek} of ${dueThisWeek.length} completed`}
        icon={<CalendarCheck aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
        label="Due this week"
        meter={{
          label: `${completedThisWeek} of ${dueThisWeek.length} tasks completed this week`,
          value: dueThisWeek.length === 0 ? 0 : (completedThisWeek / dueThisWeek.length) * 100,
        }}
        unit={dueThisWeek.length === 1 ? "task" : "tasks"}
        value={String(dueThisWeek.length)}
      />

      <StatCard
        caption={`Daily goal ${formatDuration(student.dailyGoalMinutes)}`}
        icon={<Flame aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
        label="Study streak"
        unit={streak === 1 ? "day" : "days"}
        value={String(streak)}
      />

      <StatCard
        caption={`Average focus score ${focus} over 14 days`}
        delta={{
          label: formatSigned(student.gpaDelta, 2),
          direction: student.gpaDelta > 0 ? "up" : student.gpaDelta < 0 ? "down" : "flat",
          period: "vs last term",
          upIsGood: true,
        }}
        icon={<TrendingUp aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
        label="Term GPA"
        value={student.gpa.toFixed(2)}
      />
    </div>
  );
}
