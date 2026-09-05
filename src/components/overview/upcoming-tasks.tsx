"use client";

import { Checkbox, Chip, Label, ProgressBar, cn } from "@heroui/react";
import { ListChecks } from "lucide-react";
import { CardLink } from "@/components/ui/card-link";
import { CourseDot } from "@/components/ui/course-dot";
import { NoData } from "@/components/ui/data-states";
import { DueChip, PriorityChip } from "@/components/ui/meta-chips";
import { SectionCard } from "@/components/ui/section-card";
import { useMutation } from "@/features/shared/use-mutation";
import { setTaskStatus } from "@/features/tasks/api";
import type { Course, Task } from "@/lib/supabase/database.types";
import { daysUntil, relativeDayLabel } from "@/lib/date";
import { formatDuration } from "@/lib/format";

const VISIBLE = 5;

/**
 * The next few things due.
 *
 * Ticking a task writes to Supabase — the change survives a restart, unlike the
 * local-only checkbox this replaced. `onChanged` lets the page refresh the rest
 * of the dashboard (counts, completion rate) from the same source of truth.
 */
export function UpcomingTasks({
  courses,
  onChanged,
  tasks,
}: {
  courses: Course[];
  onChanged: () => void;
  tasks: Task[];
}) {
  const open = tasks.filter((task) => task.status !== "done").slice(0, VISIBLE);
  const courseById = new Map(courses.map((course) => [course.id, course]));

  const { isPending, mutate } = useMutation(
    async (id: string, done: boolean) => setTaskStatus(id, done ? "done" : "todo"),
    { errorMessage: "Couldn't update the task", onSuccess: onChanged },
  );

  return (
    <SectionCard
      action={<CardLink href="/tasks/">All tasks</CardLink>}
      description={
        tasks.length === 0 ? "Nothing on your list yet" : `${open.length} of ${tasks.length} still open`
      }
      icon={<ListChecks aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
      title="Upcoming tasks"
    >
      {open.length === 0 ? (
        <NoData
          action={<CardLink href="/tasks/">Add a task</CardLink>}
          description={tasks.length === 0 ? "Add your first task to get started." : "Everything is done — nice."}
          icon={<ListChecks aria-hidden="true" className="size-5" strokeWidth={1.75} />}
          title={tasks.length === 0 ? "No tasks yet" : "All caught up"}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {open.map((task) => {
            const course = task.course_id ? courseById.get(task.course_id) : undefined;
            const daysAway = task.due_date ? daysUntil(task.due_date) : undefined;
            const checklistPercent =
              task.checklist_total > 0 ? (task.checklist_done / task.checklist_total) * 100 : 0;

            return (
              <li key={task.id} className="py-3 first:pt-0 last:pb-0">
                <Checkbox
                  className="w-full items-start"
                  isDisabled={isPending}
                  isSelected={false}
                  onChange={(selected) => void mutate(task.id, selected)}
                >
                  <Checkbox.Content className="w-full items-start gap-3">
                    <Checkbox.Control className="mt-0.5">
                      <Checkbox.Indicator />
                    </Checkbox.Control>

                    <span className="min-w-0 flex-1">
                      <Label className={cn("block text-sm font-medium text-balance text-foreground")}>
                        {task.title}
                      </Label>

                      <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        {course ? (
                          <>
                            <span className="inline-flex items-center gap-1.5">
                              <CourseDot course={course} />
                              {course.code}
                            </span>
                            <span aria-hidden="true">·</span>
                          </>
                        ) : null}
                        {task.estimate_minutes ? (
                          <span>{formatDuration(task.estimate_minutes)} estimated</span>
                        ) : null}
                      </span>

                      <span className="mt-2 flex flex-wrap items-center gap-1.5">
                        {task.due_date && daysAway !== undefined ? (
                          <DueChip daysAway={daysAway} label={dueLabel(task.due_date, daysAway)} />
                        ) : null}
                        <PriorityChip priority={task.priority} />
                        {task.checklist_total > 1 ? (
                          <Chip size="sm" variant="soft">
                            {task.checklist_done}/{task.checklist_total} steps
                          </Chip>
                        ) : null}
                      </span>

                      {task.checklist_total > 1 ? (
                        <ProgressBar
                          aria-label={`${task.title}: ${task.checklist_done} of ${task.checklist_total} steps done`}
                          className="mt-2.5"
                          size="sm"
                          value={checklistPercent}
                        >
                          <ProgressBar.Track>
                            <ProgressBar.Fill />
                          </ProgressBar.Track>
                        </ProgressBar>
                      ) : null}
                    </span>
                  </Checkbox.Content>
                </Checkbox>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

function dueLabel(due: string, daysAway: number): string {
  if (daysAway < 0) return `Overdue · ${relativeDayLabel(due)}`;
  if (daysAway === 0) return "Due today";
  if (daysAway === 1) return "Due tomorrow";
  return `Due ${relativeDayLabel(due)}`;
}
