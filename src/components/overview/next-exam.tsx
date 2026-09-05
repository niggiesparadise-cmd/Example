import { Card, Chip, ProgressBar } from "@heroui/react";
import { CalendarClock, MapPin } from "lucide-react";
import { CardLink } from "@/components/ui/card-link";
import { CourseDot } from "@/components/ui/course-dot";
import { courseOf, upcomingExams } from "@/data";
import { TODAY, daysUntil, formatLongDate, formatTime } from "@/lib/date";

/**
 * The next assessment, as the view's single hero figure.
 *
 * A countdown is one number, so it gets the large type rather than a chart —
 * and the two exams after it stay small underneath for context.
 */
export function NextExam() {
  const [next, ...later] = upcomingExams(TODAY);

  if (!next) {
    return (
      <Card className="justify-center border border-border p-5 text-center">
        <p className="text-sm text-muted">No assessments left this term.</p>
      </Card>
    );
  }

  const course = courseOf(next.courseId);
  const days = daysUntil(next.date);
  const countdown = days === 0 ? "Today" : days === 1 ? "Tomorrow" : String(days);

  return (
    <Card className="gap-4 border border-border p-5">
      <Card.Header className="flex-row items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock aria-hidden="true" className="size-[18px] text-muted" strokeWidth={1.85} />
          <Card.Title className="text-base font-semibold">Next assessment</Card.Title>
        </div>
        <CardLink href="/exams">All exams</CardLink>
      </Card.Header>

      <Card.Content className="gap-4">
        <div className="flex items-end gap-2">
          <span className="font-display text-5xl leading-none font-semibold text-foreground">{countdown}</span>
          {days > 1 ? <span className="pb-1 text-sm text-muted">days away</span> : null}
        </div>

        <div>
          <p className="text-sm font-medium text-balance text-foreground">{next.title}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CourseDot course={course} />
              {course.code}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatLongDate(next.date)}</span>
            <span aria-hidden="true">·</span>
            <span>
              {formatTime(next.start)}–{formatTime(next.end)}
            </span>
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted">
            <MapPin aria-hidden="true" className="size-3" strokeWidth={1.85} />
            {next.location}
            <span aria-hidden="true">·</span>
            {next.weight}% of the final grade
          </p>
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

        <div className="flex flex-wrap gap-1.5">
          {next.topics.slice(0, 3).map((topic) => (
            <Chip key={topic} size="sm" variant="soft">
              {topic}
            </Chip>
          ))}
        </div>
      </Card.Content>

      {later.length > 0 ? (
        <Card.Footer className="mt-1 flex-col items-stretch gap-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted">Then</p>
          <ul className="flex flex-col gap-2">
            {later.slice(0, 2).map((exam) => {
              const examCourse = courseOf(exam.courseId);
              const away = daysUntil(exam.date);
              return (
                <li key={exam.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <CourseDot course={examCourse} />
                    <span className="truncate text-foreground">{exam.title}</span>
                  </span>
                  <span className="tabular shrink-0 text-muted">in {away} days</span>
                </li>
              );
            })}
          </ul>
        </Card.Footer>
      ) : null}
    </Card>
  );
}
