import { Chip, cn } from "@heroui/react";
import { CalendarDays, MapPin } from "lucide-react";
import { CardLink } from "@/components/ui/card-link";
import { CourseDot } from "@/components/ui/course-dot";
import { SectionCard } from "@/components/ui/section-card";
import { courseOf, eventsOn } from "@/data";
import { courseDotClass } from "@/lib/chart-palette";
import { TODAY, durationMinutes, formatTime, timeToMinutes } from "@/lib/date";
import { formatDuration } from "@/lib/format";
import type { SessionKind } from "@/types";

const kindLabels: Record<SessionKind, string> = {
  lecture: "Lecture",
  lab: "Lab",
  seminar: "Seminar",
  tutorial: "Tutorial",
  study: "Study block",
  exam: "Exam",
};

/** The current wall-clock time used to mark what has already happened. */
const NOW_MINUTES = 12 * 60 + 40;

/** Today's timetable as a vertical timeline. */
export function TodaySchedule() {
  const events = eventsOn(TODAY);
  const remaining = events.filter((event) => timeToMinutes(event.end) > NOW_MINUTES);

  return (
    <SectionCard
      action={<CardLink href="/schedule">Full week</CardLink>}
      description={
        events.length === 0
          ? "Nothing timetabled today"
          : `${events.length} sessions · ${remaining.length} still to come`
      }
      icon={<CalendarDays aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
      title="Today's schedule"
    >
      {events.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">A clear day — a good one for revision.</p>
      ) : (
        <ol className="flex flex-col">
          {events.map((event) => {
            const course = courseOf(event.courseId);
            const isPast = timeToMinutes(event.end) <= NOW_MINUTES;
            const isNow =
              timeToMinutes(event.start) <= NOW_MINUTES && timeToMinutes(event.end) > NOW_MINUTES;

            return (
              <li key={event.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="flex w-14 shrink-0 flex-col items-end pt-0.5">
                  <span className={cn("tabular text-sm font-medium", isPast ? "text-muted" : "text-foreground")}>
                    {formatTime(event.start)}
                  </span>
                  <span className="tabular text-xs text-muted">
                    {formatDuration(durationMinutes(event.start, event.end))}
                  </span>
                </div>

                {/* The rail: a course-coloured spine, doubled by the course code below. */}
                <div className="flex flex-col items-center pt-1">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      courseDotClass[course.colorSlot],
                      isPast && "opacity-40",
                    )}
                  />
                  <span aria-hidden="true" className="mt-1 w-px flex-1 bg-border" />
                </div>

                <div className={cn("min-w-0 flex-1 pb-1", isPast && "opacity-60")}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                    {isNow ? (
                      <Chip color="accent" size="sm" variant="soft">
                        Now
                      </Chip>
                    ) : null}
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <CourseDot course={course} />
                      {course.code}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{kindLabels[event.kind]}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin aria-hidden="true" className="size-3" strokeWidth={1.85} />
                      {event.location}
                    </span>
                  </p>
                  {event.note ? <p className="mt-1 text-xs text-muted italic">{event.note}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </SectionCard>
  );
}
