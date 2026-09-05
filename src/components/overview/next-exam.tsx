"use client";

import { Card, Chip, ProgressBar } from "@heroui/react";
import { CalendarClock, MapPin } from "lucide-react";
import { CardLink } from "@/components/ui/card-link";
import { CourseDot } from "@/components/ui/course-dot";
import { NoData } from "@/components/ui/data-states";
import type { Course, Exam } from "@/lib/supabase/database.types";
import { daysUntil, formatLongDate, formatTime, todayIso } from "@/lib/date";

/** The next assessment, as the view's single hero figure. */
export function NextExam({ courses, exams }: { courses: Course[]; exams: Exam[] }) {
  const today = todayIso();
  const upcoming = exams
    .filter((exam) => exam.exam_date >= today)
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date));
  const [next, ...later] = upcoming;
  const courseById = new Map(courses.map((course) => [course.id, course]));

  if (!next) {
    return (
      <Card className="justify-center border border-border p-5">
        <NoData
          action={<CardLink href="/exams/">Add an exam</CardLink>}
          description="Add your assessments and the countdown starts here."
          icon={<CalendarClock aria-hidden="true" className="size-5" strokeWidth={1.75} />}
          title="No assessments scheduled"
        />
      </Card>
    );
  }

  const course = next.course_id ? courseById.get(next.course_id) : undefined;
  const days = daysUntil(next.exam_date);
  const countdown = days === 0 ? "Today" : days === 1 ? "Tomorrow" : String(days);

  return (
    <Card className="gap-4 border border-border p-5">
      <Card.Header className="flex-row items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock aria-hidden="true" className="size-[18px] text-muted" strokeWidth={1.85} />
          <Card.Title className="text-base font-semibold">Next assessment</Card.Title>
        </div>
        <CardLink href="/exams/">All exams</CardLink>
      </Card.Header>

      <Card.Content className="gap-4">
        <div className="flex items-end gap-2">
          <span className="font-display text-5xl leading-none font-semibold text-foreground">{countdown}</span>
          {days > 1 ? <span className="pb-1 text-sm text-muted">days away</span> : null}
        </div>

        <div>
          <p className="text-sm font-medium text-balance text-foreground">{next.title}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
            {course ? (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <CourseDot course={course} />
                  {course.code}
                </span>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <span>{formatLongDate(next.exam_date)}</span>
            {next.start_time && next.end_time ? (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {formatTime(next.start_time)}–{formatTime(next.end_time)}
                </span>
              </>
            ) : null}
          </p>
          {next.location || next.weight ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              {next.location ? (
                <>
                  <MapPin aria-hidden="true" className="size-3" strokeWidth={1.85} />
                  {next.location}
                </>
              ) : null}
              {next.location && next.weight ? <span aria-hidden="true">·</span> : null}
              {next.weight ? `${next.weight}% of the final grade` : null}
            </p>
          ) : null}
        </div>

        <ProgressBar
          aria-label={`Revision for ${next.title}`}
          color={next.preparation < 40 ? "warning" : "accent"}
          size="sm"
          value={next.preparation}
        >
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-foreground">Revision</span>
            <ProgressBar.Output className="tabular text-xs text-muted" />
          </div>
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>

        {next.topics.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {next.topics.slice(0, 3).map((topic) => (
              <Chip key={topic} size="sm" variant="soft">
                {topic}
              </Chip>
            ))}
          </div>
        ) : null}
      </Card.Content>

      {later.length > 0 ? (
        <Card.Footer className="mt-1 flex-col items-stretch gap-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted">Then</p>
          <ul className="flex flex-col gap-2">
            {later.slice(0, 2).map((exam) => {
              const examCourse = exam.course_id ? courseById.get(exam.course_id) : undefined;
              return (
                <li key={exam.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {examCourse ? <CourseDot course={examCourse} /> : null}
                    <span className="truncate text-foreground">{exam.title}</span>
                  </span>
                  <span className="tabular shrink-0 text-muted">in {daysUntil(exam.exam_date)} days</span>
                </li>
              );
            })}
          </ul>
        </Card.Footer>
      ) : null}
    </Card>
  );
}
