"use client";

import { Chip, cn } from "@heroui/react";
import { CalendarDays, MapPin } from "lucide-react";
import { CardLink } from "@/components/ui/card-link";
import { CourseDot } from "@/components/ui/course-dot";
import { NoData } from "@/components/ui/data-states";
import { SectionCard } from "@/components/ui/section-card";
import type { Course, ScheduleEvent, SessionKind } from "@/lib/supabase/database.types";
import { courseDotClass } from "@/lib/chart-palette";
import { durationMinutes, formatTime, timeToMinutes } from "@/lib/date";
import { formatDuration } from "@/lib/format";

const kindLabels: Record<SessionKind, string> = {
  lecture: "Lecture",
  lab: "Lab",
  seminar: "Seminar",
  tutorial: "Tutorial",
  study: "Study block",
  exam: "Exam",
};

/** Today's timetable as a vertical timeline. */
export function TodaySchedule({ courses, events }: { courses: Course[]; events: ScheduleEvent[] }) {
  // Real wall-clock time now, so "Now" and the dimming actually mean something.
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const remaining = events.filter((event) => timeToMinutes(event.end_time) > nowMinutes);
  const courseById = new Map(courses.map((course) => [course.id, course]));

  return (
    <SectionCard
      action={<CardLink href="/schedule/">Full week</CardLink>}
      description={
        events.length === 0
          ? "Nothing timetabled today"
          : `${events.length} sessions · ${remaining.length} still to come`
      }
      icon={<CalendarDays aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
      title="Today's schedule"
    >
      {events.length === 0 ? (
        <NoData
          action={<CardLink href="/schedule/">Add an event</CardLink>}
          description="A clear day — or nothing added to your timetable yet."
          icon={<CalendarDays aria-hidden="true" className="size-5" strokeWidth={1.75} />}
          title="Nothing scheduled"
        />
      ) : (
        <ol className="flex flex-col">
          {events.map((event) => {
            const course = event.course_id ? courseById.get(event.course_id) : undefined;
            const isPast = timeToMinutes(event.end_time) <= nowMinutes;
            const isNow = timeToMinutes(event.start_time) <= nowMinutes && !isPast;

            return (
              <li key={event.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="flex w-14 shrink-0 flex-col items-end pt-0.5">
                  <span className={cn("tabular text-sm font-medium", isPast ? "text-muted" : "text-foreground")}>
                    {formatTime(event.start_time)}
                  </span>
                  <span className="tabular text-xs text-muted">
                    {formatDuration(durationMinutes(event.start_time, event.end_time))}
                  </span>
                </div>

                <div className="flex flex-col items-center pt-1">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      course ? courseDotClass[course.color_slot] : "bg-border",
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
                    {course ? (
                      <>
                        <span className="inline-flex items-center gap-1.5">
                          <CourseDot course={course} />
                          {course.code}
                        </span>
                        <span aria-hidden="true">·</span>
                      </>
                    ) : null}
                    <span>{kindLabels[event.kind]}</span>
                    {event.location ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin aria-hidden="true" className="size-3" strokeWidth={1.85} />
                          {event.location}
                        </span>
                      </>
                    ) : null}
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
