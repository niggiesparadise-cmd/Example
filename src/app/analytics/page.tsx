"use client";

import { Button, Card } from "@heroui/react";
import { ChartNoAxesColumn, Clock, Flame, ListChecks, Target, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { CourseHoursChart } from "@/components/charts/course-hours-chart";
import { StudyHoursChart } from "@/components/charts/study-hours-chart";
import { CourseDot } from "@/components/ui/course-dot";
import { ErrorState, ListSkeleton, LoadingRegion, NoData } from "@/components/ui/data-states";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatCard } from "@/components/ui/stat-card";
import { loadAnalytics } from "@/features/analytics/api";
import { useMutation } from "@/features/shared/use-mutation";
import { useQuery } from "@/features/shared/use-query";
import { deleteSession, listSessions } from "@/features/study-sessions/api";
import { addDays, formatShortDate, todayIso } from "@/lib/date";
import { formatDuration, formatPercent, formatSigned } from "@/lib/format";

const RANGE_DAYS = 30;

export default function AnalyticsPage() {
  const load = useCallback(async () => {
    const [analytics, sessions] = await Promise.all([
      loadAnalytics(RANGE_DAYS),
      listSessions(addDays(todayIso(), -(RANGE_DAYS - 1))),
    ]);
    return { analytics, sessions };
  }, []);

  const { data, error, isLoading, refetch } = useQuery(load, []);
  const [pendingDelete, setPendingDelete] = useState<string | undefined>(undefined);

  const remove = useMutation(async (id: string) => deleteSession(id), {
    successMessage: "Session deleted.",
    errorMessage: "Couldn't delete the session",
    onSuccess: () => {
      setPendingDelete(undefined);
      void refetch();
    },
  });

  const analytics = data?.analytics;
  const sessions = data?.sessions ?? [];
  const hasData = Boolean(analytics && analytics.summary.totalMinutes > 0);
  const changePercent = analytics ? Math.round(analytics.summary.weekChange * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader
        description={`Study patterns over the last ${RANGE_DAYS} days, from your own logged sessions.`}
        title="Analytics"
      />

      {isLoading ? (
        <>
          <LoadingRegion label="Loading analytics" />
          <ListSkeleton rows={6} />
        </>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load your analytics" />
      ) : !analytics ? null : !hasData ? (
        <Card className="border border-border p-8">
          <NoData
            description="Start a study session from the Overview page and your patterns will build up here."
            icon={<ChartNoAxesColumn aria-hidden="true" className="size-5" strokeWidth={1.75} />}
            title="No study data yet"
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              caption={`Across the last ${RANGE_DAYS} days`}
              icon={<Clock aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
              label="Total study time"
              value={formatDuration(analytics.summary.totalMinutes)}
            />
            <StatCard
              delta={
                analytics.summary.previousWeekMinutes > 0
                  ? {
                      label: `${formatSigned(changePercent)}%`,
                      direction: changePercent > 0 ? "up" : changePercent < 0 ? "down" : "flat",
                      period: "vs the same days last week",
                      upIsGood: true,
                    }
                  : undefined
              }
              icon={<Target aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
              label="This week"
              value={formatDuration(analytics.summary.weekMinutes)}
            />
            <StatCard
              caption={`${analytics.summary.tasksCompleted} of ${analytics.summary.tasksTotal} tasks done`}
              icon={<ListChecks aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
              label="Task completion"
              value={analytics.summary.tasksTotal === 0 ? "—" : formatPercent(analytics.summary.completionRate)}
            />
            <StatCard
              caption={analytics.summary.averageFocus > 0 ? `Average focus ${analytics.summary.averageFocus}` : "No focus scores recorded"}
              icon={<Flame aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
              label="Study streak"
              unit={analytics.summary.streak === 1 ? "day" : "days"}
              value={String(analytics.summary.streak)}
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
            <SectionCard
              className="lg:col-span-2"
              description="Every logged session, by day."
              icon={<ChartNoAxesColumn aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
              title="Study activity"
            >
              <StudyHoursChart goalMinutes={180} points={analytics.daily} />
            </SectionCard>

            <SectionCard description="Where your time went." title="Time by course">
              {analytics.byCourse.every((total) => total.minutes === 0) ? (
                <NoData description="Link sessions to a course to see the split." title="No course time yet" />
              ) : (
                <CourseHoursChart
                  totals={[...analytics.byCourse].sort((a, b) => a.course.color_slot - b.course.color_slot)}
                />
              )}
            </SectionCard>
          </div>

          <SectionCard description={`${sessions.length} sessions in the last ${RANGE_DAYS} days`} title="Recent sessions">
            {sessions.length === 0 ? (
              <NoData description="Logged sessions appear here." title="Nothing logged" />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {sessions.slice(0, 20).map((session) => {
                  const course = analytics.byCourse.find((total) => total.course.id === session.course_id)?.course;
                  return (
                    <li key={session.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm text-foreground">
                          {course ? <CourseDot course={course} /> : null}
                          {course?.code ?? "No course"}
                        </p>
                        <p className="text-xs text-muted">
                          {formatShortDate(session.started_at.slice(0, 10))}
                          {session.focus !== null ? ` · focus ${session.focus}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="tabular text-sm font-medium text-foreground">
                          {formatDuration(session.duration_minutes ?? 0)}
                        </span>
                        <Button
                          aria-label="Delete session"
                          isDisabled={remove.isPending && pendingDelete === session.id}
                          isIconOnly
                          onPress={() => {
                            setPendingDelete(session.id);
                            void remove.mutate(session.id);
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 aria-hidden="true" className="size-3.5" strokeWidth={1.85} />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
