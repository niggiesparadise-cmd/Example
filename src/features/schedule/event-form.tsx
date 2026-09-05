"use client";

import { Label, ListBox, Select } from "@heroui/react";
import { useState } from "react";
import { TextAreaField, TextInputField } from "@/components/form/text-field";
import { FormDialog } from "@/components/ui/form-dialog";
import { useMutation } from "@/features/shared/use-mutation";
import type { Course, ScheduleEvent, SessionKind } from "@/lib/supabase/database.types";
import { createEvent, updateEvent, type ScheduleEventInput } from "./api";

const KINDS: { id: SessionKind; label: string }[] = [
  { id: "lecture", label: "Lecture" },
  { id: "lab", label: "Lab" },
  { id: "seminar", label: "Seminar" },
  { id: "tutorial", label: "Tutorial" },
  { id: "study", label: "Study block" },
  { id: "exam", label: "Exam" },
];

interface FormState {
  title: string;
  course_id: string;
  kind: SessionKind;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  note: string;
}

function toFormState(event?: ScheduleEvent, defaultDate?: string): FormState {
  return {
    title: event?.title ?? "",
    course_id: event?.course_id ?? "none",
    kind: event?.kind ?? "lecture",
    event_date: event?.event_date ?? defaultDate ?? "",
    start_time: event?.start_time?.slice(0, 5) ?? "09:00",
    end_time: event?.end_time?.slice(0, 5) ?? "10:00",
    location: event?.location ?? "",
    note: event?.note ?? "",
  };
}

function validate(form: FormState) {
  return {
    title: form.title.trim() ? undefined : "Title is required.",
    event_date: form.event_date ? undefined : "Date is required.",
    start_time: form.start_time ? undefined : "Start time is required.",
    // Matches the table's `event_ends_after_it_starts` constraint.
    end_time: !form.end_time
      ? "End time is required."
      : form.end_time > form.start_time
        ? undefined
        : "End time must be after the start.",
  };
}

export function EventFormDialog({
  courses,
  defaultDate,
  event,
  isOpen,
  onOpenChange,
  onSaved,
}: {
  courses: Course[];
  defaultDate?: string;
  event?: ScheduleEvent;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(event, defaultDate));
  const [touched, setTouched] = useState(false);


  const errors = validate(form);
  const isFormValid = Object.values(errors).every((message) => message === undefined);

  const { error, isPending, mutate } = useMutation(
    async () => {
      const payload: ScheduleEventInput = {
        title: form.title.trim(),
        course_id: form.course_id === "none" ? null : form.course_id,
        kind: form.kind,
        event_date: form.event_date,
        start_time: form.start_time,
        end_time: form.end_time,
        location: form.location.trim() || null,
        note: form.note.trim() || null,
      };
      return event ? updateEvent(event.id, payload) : createEvent(payload);
    },
    {
      successMessage: event ? "Event updated." : "Event added.",
      errorMessage: event ? "Couldn't update the event" : "Couldn't add the event",
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
      submitLabel={event ? "Save changes" : "Add event"}
      title={event ? "Edit event" : "Add an event"}
    >
      <TextInputField
        errorMessage={touched ? errors.title : undefined}
        isRequired
        label="Title"
        onChange={(value) => set("title", value)}
        placeholder="Algorithms Lecture"
        value={form.title}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select onSelectionChange={(key) => set("course_id", String(key))} selectedKey={form.course_id}>
          <Label>Course</Label>
          <Select.Trigger />
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="none" textValue="No course">No course</ListBox.Item>
              {courses.map((course) => (
                <ListBox.Item key={course.id} id={course.id} textValue={course.code}>
                  {course.code}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select onSelectionChange={(key) => set("kind", String(key) as SessionKind)} selectedKey={form.kind}>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TextInputField
          errorMessage={touched ? errors.event_date : undefined}
          isRequired
          label="Date"
          onChange={(value) => set("event_date", value)}
          type="date"
          value={form.event_date}
        />
        <TextInputField
          errorMessage={touched ? errors.start_time : undefined}
          isRequired
          label="Start"
          onChange={(value) => set("start_time", value)}
          type="time"
          value={form.start_time}
        />
        <TextInputField
          errorMessage={touched ? errors.end_time : undefined}
          isRequired
          label="End"
          onChange={(value) => set("end_time", value)}
          type="time"
          value={form.end_time}
        />
      </div>

      <TextInputField
        label="Location"
        onChange={(value) => set("location", value)}
        placeholder="Turing Hall 204"
        value={form.location}
      />
      <TextAreaField label="Note" onChange={(value) => set("note", value)} rows={2} value={form.note} />
    </FormDialog>
  );
}
