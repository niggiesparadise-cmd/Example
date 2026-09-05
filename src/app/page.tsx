"use client";

import { Button, Chip } from "@heroui/react";
import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { CourseProgress } from "@/components/overview/course-progress";
import { NextExam } from "@/components/overview/next-exam";
import { OverviewStats } from "@/components/overview/overview-stats";
import { RecentNotes } from "@/components/overview/recent-notes";
import { StudyActivity } from "@/components/overview/study-activity";
import { StudyBreakdown } from "@/components/overview/study-breakdown";
import { TodaySchedule } from "@/components/overview/today-schedule";
import { UpcomingTasks } from "@/components/overview/upcoming-tasks";
import { ErrorState, ListSkeleton, LoadingRegion } from "@/components/ui/data-states";
import { PageHeader } from "@/components/ui/page-header";
import { useAuth } from "@/features/auth/auth-provider";
import { isEmptyAccount, useOverview } from "@/features/overview/use-overview";
import { useProfile } from "@/features/profile/use-profile";
import { StudyTimer } from "@/features/study-sessions/study-timer";
import { formatLongDate, todayIso } from "@/lib/date";

export default function OverviewPage() {
  const { data, error, isLoading, refetch } = useOverview();
  const { data: profile } = useProfile();
  const { user } = useAuth();

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? user?.email?.split("@")[0] ?? "there";

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader
        actions={
          <>
            <StudyTimer courses={data?.courses ?? []} onChanged={refetch} />
            <Button size="sm" variant="primary">
              <Link className="flex items-center gap-1.5" href="/tasks/">
                <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
                New task
              </Link>
            </Button>
          </>
        }
        description={
          data && isEmptyAccount(data)
            ? "Your dashboard is empty. Add a course to get started, or load the demo data from Settings."
            : "Everything due, scheduled and studied — from your own records."
        }
        eyebrow={
          <>
            <span className="text-sm text-muted">{formatLongDate(todayIso())}</span>
            {profile?.term ? (
              <Chip size="sm" variant="soft">
                {profile.term}
              </Chip>
            ) : null}
          </>
        }
        title={`${greeting()}, ${firstName}`}
      />

      {isLoading ? (
        <>
          <LoadingRegion label="Loading your dashboard" />
          <ListSkeleton rows={8} />
        </>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load your dashboard" />
      ) : data ? (
        <>
          {isEmptyAccount(data) ? (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface p-4">
              <Sparkles aria-hidden="true" className="size-5 shrink-0 text-accent" strokeWidth={1.85} />
              <p className="min-w-0 flex-1 text-sm text-muted">
                Nothing here yet. Add your courses, tasks and timetable — or load a sample term to explore.
              </p>
              <Button size="sm" variant="secondary">
                <Link href="/settings/">Open Settings</Link>
              </Button>
            </div>
          ) : null}

          <OverviewStats
            dailyMinutes={data.analytics.daily.map((point) => point.minutes)}
            summary={data.analytics.summary}
            tasks={data.tasks}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <StudyActivity className="lg:col-span-2" points={data.analytics.daily.slice(-14)} />
            <NextExam courses={data.courses} exams={data.exams} />
          </div>

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <TodaySchedule courses={data.courses} events={data.todayEvents} />
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                <CourseProgress courses={data.courses} />
                <RecentNotes courses={data.courses} notes={data.notes} />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <UpcomingTasks courses={data.courses} onChanged={refetch} tasks={data.tasks} />
              <StudyBreakdown totals={data.analytics.byCourse} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Time-of-day greeting, from the user's own clock. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
