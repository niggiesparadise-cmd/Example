"use client";

import { Button, Card, Checkbox, Chip, Label, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { CourseDot } from "@/components/ui/course-dot";
import { ErrorState, ListSkeleton, LoadingRegion, NoData } from "@/components/ui/data-states";
import { ConfirmDeleteDialog } from "@/components/ui/form-dialog";
import { DueChip, PriorityChip } from "@/components/ui/meta-chips";
import { PageHeader } from "@/components/ui/page-header";
import { listCourses } from "@/features/courses/api";
import { useMutation } from "@/features/shared/use-mutation";
import { useQuery } from "@/features/shared/use-query";
import { deleteTask, listTasks, setTaskStatus } from "@/features/tasks/api";
import { TaskFormDialog } from "@/features/tasks/task-form";
import type { Task } from "@/lib/supabase/database.types";
import { daysUntil, relativeDayLabel } from "@/lib/date";
import { formatDuration } from "@/lib/format";

type Filter = "open" | "done" | "all";

export default function TasksPage() {
  const load = useCallback(async () => {
    const [tasks, courses] = await Promise.all([listTasks(), listCourses()]);
    return { tasks, courses };
  }, []);

  const { data, error, isLoading, refetch } = useQuery(load, []);
  const [filter, setFilter] = useState<Filter>("open");
  const [editing, setEditing] = useState<Task | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Task | undefined>(undefined);

  const toggle = useMutation(
    async (id: string, done: boolean) => setTaskStatus(id, done ? "done" : "todo"),
    { errorMessage: "Couldn't update the task", onSuccess: () => void refetch() },
  );

  const remove = useMutation(async (id: string) => deleteTask(id), {
    successMessage: "Task deleted.",
    errorMessage: "Couldn't delete the task",
    onSuccess: () => {
      setPendingDelete(undefined);
      void refetch();
    },
  });

  const allTasks = data?.tasks ?? [];
  const courses = data?.courses ?? [];
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const visible = allTasks.filter((task) =>
    filter === "all" ? true : filter === "done" ? task.status === "done" : task.status !== "done",
  );
  const openCount = allTasks.filter((task) => task.status !== "done").length;

  const openForm = (task?: Task) => {
    setEditing(task);
    setIsFormOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader
        actions={
          <Button onPress={() => openForm()} size="sm" variant="primary">
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
            Add task
          </Button>
        }
        description={
          allTasks.length === 0
            ? "Assignments, readings and problem sets."
            : `${openCount} open of ${allTasks.length}`
        }
        title="Tasks"
      />

      {allTasks.length > 0 ? (
        <ToggleButtonGroup
          aria-label="Filter tasks"
          onSelectionChange={(keys) => {
            const [key] = [...keys];
            if (key) setFilter(key as Filter);
          }}
          selectedKeys={[filter]}
          selectionMode="single"
        >
          <ToggleButton id="open">Open</ToggleButton>
          <ToggleButton id="done">Done</ToggleButton>
          <ToggleButton id="all">All</ToggleButton>
        </ToggleButtonGroup>
      ) : null}

      {isLoading ? (
        <>
          <LoadingRegion label="Loading tasks" />
          <ListSkeleton rows={5} />
        </>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load your tasks" />
      ) : visible.length === 0 ? (
        <Card className="border border-border p-8">
          <NoData
            action={
              allTasks.length === 0 ? (
                <Button onPress={() => openForm()} size="sm" variant="primary">
                  <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
                  Add your first task
                </Button>
              ) : undefined
            }
            description={
              allTasks.length === 0
                ? "Track assignments, readings and revision in one place."
                : filter === "done"
                  ? "Nothing completed yet."
                  : "Everything is done — nice."
            }
            icon={<ListChecks aria-hidden="true" className="size-5" strokeWidth={1.75} />}
            title={allTasks.length === 0 ? "No tasks yet" : "Nothing here"}
          />
        </Card>
      ) : (
        <Card className="border border-border p-0">
          <ul className="flex flex-col divide-y divide-border">
            {visible.map((task) => {
              const course = task.course_id ? courseById.get(task.course_id) : undefined;
              const daysAway = task.due_date ? daysUntil(task.due_date) : undefined;
              const isDone = task.status === "done";

              return (
                <li key={task.id} className="flex items-start gap-3 p-4">
                  <Checkbox
                    aria-label={`Mark ${task.title} ${isDone ? "not done" : "done"}`}
                    className="mt-0.5"
                    isDisabled={toggle.isPending}
                    isSelected={isDone}
                    onChange={(selected) => void toggle.mutate(task.id, selected)}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                    </Checkbox.Content>
                  </Checkbox>

                  <div className="min-w-0 flex-1">
                    <Label className={isDone ? "text-sm font-medium text-muted line-through" : "text-sm font-medium text-foreground"}>
                      {task.title}
                    </Label>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                      {course ? (
                        <span className="inline-flex items-center gap-1.5">
                          <CourseDot course={course} />
                          {course.code}
                        </span>
                      ) : null}
                      {task.estimate_minutes ? <span>{formatDuration(task.estimate_minutes)}</span> : null}
                      {task.checklist_total > 0 ? (
                        <span>
                          {task.checklist_done}/{task.checklist_total} steps
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {task.due_date && daysAway !== undefined && !isDone ? (
                        <DueChip
                          daysAway={daysAway}
                          label={
                            daysAway < 0
                              ? `Overdue · ${relativeDayLabel(task.due_date)}`
                              : daysAway === 0
                                ? "Due today"
                                : `Due ${relativeDayLabel(task.due_date)}`
                          }
                        />
                      ) : null}
                      <PriorityChip priority={task.priority} />
                      {task.status === "in-progress" ? (
                        <Chip color="accent" size="sm" variant="soft">
                          In progress
                        </Chip>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <Button
                      aria-label={`Edit ${task.title}`}
                      isIconOnly
                      onPress={() => openForm(task)}
                      size="sm"
                      variant="ghost"
                    >
                      <Pencil aria-hidden="true" className="size-4" strokeWidth={1.85} />
                    </Button>
                    <Button
                      aria-label={`Delete ${task.title}`}
                      isIconOnly
                      onPress={() => setPendingDelete(task)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.85} />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {isFormOpen ? (
        <TaskFormDialog
          key={`${editing?.id ?? 'new'}`}
          courses={courses}
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSaved={refetch}
          task={editing}
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
        title="Delete this task?"
      />
    </div>
  );
}
