"use client";

import { Button, Card } from "@heroui/react";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { CourseDot } from "@/components/ui/course-dot";
import { ErrorState, ListSkeleton, LoadingRegion, NoData } from "@/components/ui/data-states";
import { ConfirmDeleteDialog } from "@/components/ui/form-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { listCourses } from "@/features/courses/api";
import { deleteEvent, listEvents } from "@/features/schedule/api";
import { EventFormDialog } from "@/features/schedule/event-form";
import { useMutation } from "@/features/shared/use-mutation";
import { useQuery } from "@/features/shared/use-query";
import type { ScheduleEvent } from "@/lib/supabase/database.types";
import { addDays, durationMinutes, formatDayMonth, formatTime, formatWeekday, startOfWeek, todayIso } from "@/lib/date";
import { formatDuration } from "@/lib/format";

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayIso()));
  const weekEnd = addDays(weekStart, 6);

  const load = useCallback(async () => {
    const [events, courses] = await Promise.all([listEvents(weekStart, weekEnd), listCourses()]);
    return { events, courses };
  }, [weekStart, weekEnd]);

  const { data, error, isLoading, refetch } = useQuery(load, [weekStart]);
  const [editing, setEditing] = useState<ScheduleEvent | undefined>(undefined);
  const [formDate, setFormDate] = useState<string | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ScheduleEvent | undefined>(undefined);

  const remove = useMutation(async (id: string) => deleteEvent(id), {
    successMessage: "Event deleted.",
    errorMessage: "Couldn't delete the event",
    onSuccess: () => {
      setPendingDelete(undefined);
      void refetch();
    },
  });

  const events = data?.events ?? [];
  const courses = data?.courses ?? [];
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const today = todayIso();
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const openForm = (event?: ScheduleEvent, date?: string) => {
    setEditing(event);
    setFormDate(date);
    setIsFormOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader
        actions={
          <Button onPress={() => openForm(undefined, today)} size="sm" variant="primary">
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
            Add event
          </Button>
        }
        description={`${formatDayMonth(weekStart)} – ${formatDayMonth(weekEnd)}`}
        title="Schedule"
      />

      <div className="flex items-center gap-2">
        <Button aria-label="Previous week" isIconOnly onPress={() => setWeekStart(addDays(weekStart, -7))} size="sm" variant="secondary">
          <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={1.85} />
        </Button>
        <Button onPress={() => setWeekStart(startOfWeek(today))} size="sm" variant="tertiary">
          This week
        </Button>
        <Button aria-label="Next week" isIconOnly onPress={() => setWeekStart(addDays(weekStart, 7))} size="sm" variant="secondary">
          <ChevronRight aria-hidden="true" className="size-4" strokeWidth={1.85} />
        </Button>
      </div>

      {isLoading ? (
        <>
          <LoadingRegion label="Loading your schedule" />
          <ListSkeleton rows={6} />
        </>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load your schedule" />
      ) : events.length === 0 ? (
        <Card className="border border-border p-8">
          <NoData
            action={
              <Button onPress={() => openForm(undefined, today)} size="sm" variant="primary">
                <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
                Add an event
              </Button>
            }
            description="Nothing timetabled this week. Add lectures, labs and study blocks."
            icon={<CalendarDays aria-hidden="true" className="size-5" strokeWidth={1.75} />}
            title="An empty week"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          {days.map((day) => {
            const dayEvents = events.filter((event) => event.event_date === day);
            const isToday = day === today;

            return (
              <Card key={day} className={`gap-3 border p-4 ${isToday ? "border-accent" : "border-border"}`}>
                <Card.Header className="flex-row items-center justify-between gap-2">
                  <div>
                    <Card.Title className="text-sm font-semibold">{formatWeekday(day)}</Card.Title>
                    <Card.Description className="text-xs">{formatDayMonth(day)}</Card.Description>
                  </div>
                  <Button aria-label={`Add event on ${formatDayMonth(day)}`} isIconOnly onPress={() => openForm(undefined, day)} size="sm" variant="ghost">
                    <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
                  </Button>
                </Card.Header>

                <Card.Content className="gap-2">
                  {dayEvents.length === 0 ? (
                    <p className="py-2 text-xs text-muted">Nothing scheduled.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {dayEvents.map((event) => {
                        const course = event.course_id ? courseById.get(event.course_id) : undefined;
                        return (
                          <li key={event.id} className="rounded-xl bg-surface-secondary p-2.5">
                            <div className="flex items-start justify-between gap-1">
                              <p className="min-w-0 text-sm font-medium text-foreground">{event.title}</p>
                              <div className="flex shrink-0">
                                <Button aria-label={`Edit ${event.title}`} isIconOnly onPress={() => openForm(event)} size="sm" variant="ghost">
                                  <Pencil aria-hidden="true" className="size-3" strokeWidth={1.85} />
                                </Button>
                                <Button aria-label={`Delete ${event.title}`} isIconOnly onPress={() => setPendingDelete(event)} size="sm" variant="ghost">
                                  <Trash2 aria-hidden="true" className="size-3" strokeWidth={1.85} />
                                </Button>
                              </div>
                            </div>
                            <p className="tabular mt-1 text-xs text-muted">
                              {formatTime(event.start_time)}–{formatTime(event.end_time)} ·{" "}
                              {formatDuration(durationMinutes(event.start_time, event.end_time))}
                            </p>
                            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
                              {course ? (
                                <span className="inline-flex items-center gap-1">
                                  <CourseDot course={course} />
                                  {course.code}
                                </span>
                              ) : null}
                              {event.location ? (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin aria-hidden="true" className="size-3" strokeWidth={1.85} />
                                  {event.location}
                                </span>
                              ) : null}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card.Content>
              </Card>
            );
          })}
        </div>
      )}

      {isFormOpen ? (
        <EventFormDialog
          key={`${editing?.id ?? 'new'}`}
          courses={courses}
          defaultDate={formDate}
          event={editing}
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSaved={refetch}
        />
      ) : null}

      <ConfirmDeleteDialog
        description={pendingDelete ? `"${pendingDelete.title}" will be permanently deleted.` : ""}
        isOpen={Boolean(pendingDelete)}
        isPending={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) void remove.mutate(pendingDelete.id);
        }}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(undefined);
        }}
        title="Delete this event?"
      />
    </div>
  );
}
