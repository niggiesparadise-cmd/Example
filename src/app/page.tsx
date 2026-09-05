import { Button, Chip } from "@heroui/react";
import { Plus, Timer } from "lucide-react";
import { CourseProgress } from "@/components/overview/course-progress";
import { NextExam } from "@/components/overview/next-exam";
import { OverviewStats } from "@/components/overview/overview-stats";
import { RecentNotes } from "@/components/overview/recent-notes";
import { StudyActivity } from "@/components/overview/study-activity";
import { StudyBreakdown } from "@/components/overview/study-breakdown";
import { TodaySchedule } from "@/components/overview/today-schedule";
import { UpcomingTasks } from "@/components/overview/upcoming-tasks";
import { PageHeader } from "@/components/ui/page-header";
import { student } from "@/data";
import { TODAY, formatLongDate } from "@/lib/date";

export const metadata = {
  title: "Overview",
  description: "Today's schedule, upcoming work and how the term is going.",
};

/** The greeting that opens the page — fixed to the demo's reference time. */
const GREETING = "Good afternoon";

export default function OverviewPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader
        actions={
          <>
            <Button size="sm" variant="secondary">
              <Timer aria-hidden="true" className="size-4" strokeWidth={2} />
              Start focus session
            </Button>
            <Button className="sm:hidden" size="sm" variant="primary">
              <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
              New task
            </Button>
          </>
        }
        description="Three sessions left today and a problem set due tonight — the algorithms midterm is the thing to protect time for."
        eyebrow={
          <>
            <span className="text-sm text-muted">{formatLongDate(TODAY)}</span>
            <Chip size="sm" variant="soft">
              Week {student.currentWeek} of {student.totalWeeks}
            </Chip>
            <Chip size="sm" variant="soft">
              {student.term}
            </Chip>
          </>
        }
        title={`${GREETING}, ${student.firstName}`}
      />

      <OverviewStats />

      {/*
        Study activity leads, with the exam countdown beside it as the hero
        figure. Both cards are direct grid children so the row stretches them to
        a shared height and the chart grows to fill it.
      */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StudyActivity className="lg:col-span-2" />
        <NextExam />
      </div>

      {/*
        Two columns from `lg`: today and the term on the left, the work queue on
        the right. Each column stacks independently, so a tall card never leaves
        a hole beside a short one, and the two run to roughly the same length.
      */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <TodaySchedule />
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
            <CourseProgress />
            <RecentNotes />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <UpcomingTasks />
          <StudyBreakdown />
        </div>
      </div>
    </div>
  );
}
