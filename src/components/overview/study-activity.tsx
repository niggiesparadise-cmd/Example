import { Chip } from "@heroui/react";
import { Activity } from "lucide-react";
import { StudyHoursChart } from "@/components/charts/study-hours-chart";
import { SectionCard } from "@/components/ui/section-card";
import { recentDailyStudy, student } from "@/data";
import { formatDuration } from "@/lib/format";

const RANGE_DAYS = 14;

/** Daily study time over the last fortnight, against the daily goal. */
export function StudyActivity({ className }: { className?: string }) {
  const points = recentDailyStudy(RANGE_DAYS);
  const today = points[points.length - 1];
  const metGoal = points.filter((point) => point.minutes >= student.dailyGoalMinutes).length;

  return (
    <SectionCard
      action={
        <Chip size="sm" variant="soft">
          Last {RANGE_DAYS} days
        </Chip>
      }
      className={className}
      description={`Today: ${formatDuration(today.minutes)} · goal met on ${metGoal} of ${RANGE_DAYS} days`}
      icon={<Activity aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
      title="Study activity"
    >
      <StudyHoursChart goalMinutes={student.dailyGoalMinutes} points={points} />

      <p className="flex items-center gap-2 text-xs text-muted">
        <span
          aria-hidden="true"
          className="inline-block w-6 shrink-0 border-t border-dashed border-muted"
        />
        Daily goal · {formatDuration(student.dailyGoalMinutes)}
      </p>
    </SectionCard>
  );
}
