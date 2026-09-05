"use client";

import { Chip } from "@heroui/react";
import { Activity } from "lucide-react";
import { StudyHoursChart } from "@/components/charts/study-hours-chart";
import { NoData } from "@/components/ui/data-states";
import { SectionCard } from "@/components/ui/section-card";
import type { DailyStudyPoint } from "@/features/analytics/api";
import { formatDuration } from "@/lib/format";

const GOAL_MINUTES = 180;

/** Daily study time over the loaded window, against the daily goal. */
export function StudyActivity({ className, points }: { className?: string; points: DailyStudyPoint[] }) {
  const today = points[points.length - 1];
  const logged = points.filter((point) => point.minutes > 0).length;
  const metGoal = points.filter((point) => point.minutes >= GOAL_MINUTES).length;

  return (
    <SectionCard
      action={
        <Chip size="sm" variant="soft">
          Last {points.length} days
        </Chip>
      }
      className={className}
      description={
        logged === 0
          ? "No study sessions logged yet"
          : `Today: ${formatDuration(today?.minutes ?? 0)} · goal met on ${metGoal} of ${points.length} days`
      }
      icon={<Activity aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
      title="Study activity"
    >
      {logged === 0 ? (
        <NoData
          description="Start a study session and your hours will show up here."
          icon={<Activity aria-hidden="true" className="size-5" strokeWidth={1.75} />}
          title="Nothing logged yet"
        />
      ) : (
        <>
          <StudyHoursChart goalMinutes={GOAL_MINUTES} points={points} />
          <p className="flex items-center gap-2 text-xs text-muted">
            <span aria-hidden="true" className="inline-block w-6 shrink-0 border-t border-dashed border-muted" />
            Daily goal · {formatDuration(GOAL_MINUTES)}
          </p>
        </>
      )}
    </SectionCard>
  );
}
