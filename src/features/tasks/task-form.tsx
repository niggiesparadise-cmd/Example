"use client";

import { Label, ListBox, Select } from "@heroui/react";
import { useState } from "react";
import { TextInputField } from "@/components/form/text-field";
import { FormDialog } from "@/components/ui/form-dialog";
import { useMutation } from "@/features/shared/use-mutation";
import type { Course, Task, TaskKind, TaskPriority, TaskStatus } from "@/lib/supabase/database.types";
import { createTask, updateTask, type TaskInput } from "./api";

const KINDS: { id: TaskKind; label: string }[] = [
  { id: "assignment", label: "Assignment" },
  { id: "reading", label: "Reading" },
  { id: "problem-set", label: "Problem set" },
  { id: "project", label: "Project" },
  { id: "lab-report", label: "Lab report" },
  { id: "revision", label: "Revision" },
];
const PRIORITIES: { id: TaskPriority; label: string }[] = [
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];
const STATUSES: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To do" },
  { id: "in-progress", label: "In progress" },
  { id: "done", label: "Done" },
];

interface FormState {
  title: string;
  course_id: string;
  kind: TaskKind;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  estimate_minutes: string;
  checklist_done: string;
  checklist_total: string;
}

function toFormState(task?: Task): FormState {
  return {
    title: task?.title ?? "",
    course_id: task?.course_id ?? "none",
    kind: task?.kind ?? "assignment",
    status: task?.status ?? "todo",
    priority: task?.priority ?? "medium",
    due_date: task?.due_date ?? "",
    estimate_minutes: task?.estimate_minutes?.toString() ?? "",
    checklist_done: task?.checklist_done?.toString() ?? "0",
    checklist_total: task?.checklist_total?.toString() ?? "0",
  };
}

/** Mirrors the table's CHECK constraints so invalid rows never leave the client. */
function validate(form: FormState) {
  const done = Number(form.checklist_done || 0);
  const total = Number(form.checklist_total || 0);
  const estimate = form.estimate_minutes.trim() === "" ? null : Number(form.estimate_minutes);

  return {
    title: form.title.trim() ? undefined : "Title is required.",
    estimate:
      estimate === null || (Number.isFinite(estimate) && estimate >= 0 && estimate <= 10080)
        ? undefined
        : "Estimate must be between 0 and 10080 minutes.",
    checklist:
      Number.isFinite(done) && Number.isFinite(total) && done >= 0 && total >= 0 && done <= total
        ? undefined
        : "Steps done can't exceed the total.",
  };
}

export function TaskFormDialog({
  courses,
  isOpen,
  onOpenChange,
  onSaved,
  task,
}: {
  courses: Course[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  task?: Task;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(task));
  const [touched, setTouched] = useState(false);


  const errors = validate(form);
  const isFormValid = Object.values(errors).every((message) => message === undefined);

  const { error, isPending, mutate } = useMutation(
    async () => {
      const payload: TaskInput = {
        title: form.title.trim(),
        course_id: form.course_id === "none" ? null : form.course_id,
        kind: form.kind,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        estimate_minutes: form.estimate_minutes.trim() === "" ? null : Number(form.estimate_minutes),
        checklist_done: Number(form.checklist_done || 0),
        checklist_total: Number(form.checklist_total || 0),
        // A trigger derives this from `status`; sending it risks disagreement.
        completed_at: null,
      };
      return task ? updateTask(task.id, payload) : createTask(payload);
    },
    {
      successMessage: task ? "Task updated." : "Task added.",
      errorMessage: task ? "Couldn't update the task" : "Couldn't add the task",
      onSuccess: () => {
        onOpenChange(false);
        onSaved();
      },
    },
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  return (
    <FormDialog
      error={error}
      isOpen={isOpen}
      isPending={isPending}
      onOpenChange={onOpenChange}
      onSubmit={() => {
        setTouched(true);
        if (isFormValid) void mutate();
      }}
      submitLabel={task ? "Save changes" : "Add task"}
      title={task ? "Edit task" : "Add a task"}
    >
      <TextInputField
        errorMessage={touched ? errors.title : undefined}
        isRequired
        label="Title"
        onChange={(value) => set("title", value)}
        placeholder="Problem Set 3 — Amortised Analysis"
        value={form.title}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select onSelectionChange={(key) => set("course_id", String(key))} selectedKey={form.course_id}>
          <Label>Course</Label>
          <Select.Trigger />
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="none" textValue="No course">
                No course
              </ListBox.Item>
              {courses.map((course) => (
                <ListBox.Item key={course.id} id={course.id} textValue={course.code}>
                  {course.code}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select onSelectionChange={(key) => set("kind", String(key) as TaskKind)} selectedKey={form.kind}>
          <Label>Type</Label>
          <Select.Trigger />
          <Select.Popover>
            <ListBox>
              {KINDS.map((kind) => (
                <ListBox.Item key={kind.id} id={kind.id} textValue={kind.label}>
                  {kind.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          onSelectionChange={(key) => set("priority", String(key) as TaskPriority)}
          selectedKey={form.priority}
        >
          <Label>Priority</Label>
          <Select.Trigger />
          <Select.Popover>
            <ListBox>
              {PRIORITIES.map((priority) => (
                <ListBox.Item key={priority.id} id={priority.id} textValue={priority.label}>
                  {priority.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select onSelectionChange={(key) => set("status", String(key) as TaskStatus)} selectedKey={form.status}>
          <Label>Status</Label>
          <Select.Trigger />
          <Select.Popover>
            <ListBox>
              {STATUSES.map((status) => (
                <ListBox.Item key={status.id} id={status.id} textValue={status.label}>
                  {status.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInputField
          label="Due date"
          onChange={(value) => set("due_date", value)}
          type="date"
          value={form.due_date}
        />
        <TextInputField
          errorMessage={touched ? errors.estimate : undefined}
          hint="Minutes."
          label="Estimate"
          onChange={(value) => set("estimate_minutes", value)}
          placeholder="120"
          type="number"
          value={form.estimate_minutes}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInputField
          label="Steps done"
          onChange={(value) => set("checklist_done", value)}
          type="number"
          value={form.checklist_done}
        />
        <TextInputField
          errorMessage={touched ? errors.checklist : undefined}
          label="Steps total"
          onChange={(value) => set("checklist_total", value)}
          type="number"
          value={form.checklist_total}
        />
      </div>
    </FormDialog>
  );
}
