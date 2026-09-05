"use client";

import { Checkbox, Chip, Label, ProgressBar, cn } from "@heroui/react";
import { ListChecks } from "lucide-react";
import { useState } from "react";
import { CardLink } from "@/components/ui/card-link";
import { CourseDot } from "@/components/ui/course-dot";
import { DueChip, PriorityChip } from "@/components/ui/meta-chips";
import { SectionCard } from "@/components/ui/section-card";
import { courseOf, openTasks } from "@/data";
import { daysUntil, relativeDayLabel } from "@/lib/date";
import { formatDuration } from "@/lib/format";

const VISIBLE = 5;

/**
 * The next few things due.
 *
 * Ticking a task keeps its state locally — the list is the demo's only piece of
 * mutable state, so it lives in the component rather than in the data layer.
 */
export function UpcomingTasks() {
  const items = openTasks().slice(0, VISIBLE);
  const [completed, setCompleted] = useState<ReadonlySet<string>>(new Set());

  const toggle = (id: string, isSelected: boolean) => {
    setCompleted((previous) => {
      const next = new Set(previous);
      if (isSelected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const remaining = items.length - completed.size;

  return (
    <SectionCard
      action={<CardLink href="/tasks">All tasks</CardLink>}
      description={`${remaining} of the next ${items.length} still open`}
      icon={<ListChecks aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
      title="Upcoming tasks"
    >
      <ul className="flex flex-col divide-y divide-border">
        {items.map((task) => {
          const course = courseOf(task.courseId);
          const isDone = completed.has(task.id);
          const daysAway = daysUntil(task.due);
          const checklistPercent = (task.checklist.done / task.checklist.total) * 100;

          return (
            <li key={task.id} className="py-3 first:pt-0 last:pb-0">
              <Checkbox
                className="w-full items-start"
                isSelected={isDone}
                onChange={(isSelected) => toggle(task.id, isSelected)}
              >
                <Checkbox.Content className="w-full items-start gap-3">
                  <Checkbox.Control className="mt-0.5">
                    <Checkbox.Indicator />
                  </Checkbox.Control>

                  <span className="min-w-0 flex-1">
                    <Label
                      className={cn(
                        "block text-sm font-medium text-balance",
                        isDone ? "text-muted line-through" : "text-foreground",
                      )}
                    >
                      {task.title}
                    </Label>

                    <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <CourseDot course={course} />
                        {course.code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDuration(task.estimateMinutes)} estimated</span>
                    </span>

                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      <DueChip daysAway={daysAway} label={dueLabel(task.due, daysAway)} />
                      <PriorityChip priority={task.priority} />
                      {task.checklist.total > 1 ? (
                        <Chip size="sm" variant="soft">
                          {task.checklist.done}/{task.checklist.total} steps
                        </Chip>
                      ) : null}
                    </span>

                    {task.checklist.total > 1 ? (
                      <ProgressBar
                        aria-label={`${task.title}: ${task.checklist.done} of ${task.checklist.total} steps done`}
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
    </SectionCard>
  );
}

function dueLabel(due: string, daysAway: number): string {
  if (daysAway < 0) return `Overdue · ${relativeDayLabel(due)}`;
  if (daysAway === 0) return "Due today";
  if (daysAway === 1) return "Due tomorrow";
  return `Due ${relativeDayLabel(due)}`;
}
