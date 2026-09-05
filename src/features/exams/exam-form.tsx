"use client";

import { Label, ListBox, Select } from "@heroui/react";
import { useState } from "react";
import { TextAreaField, TextInputField } from "@/components/form/text-field";
import { FormDialog } from "@/components/ui/form-dialog";
import { useMutation } from "@/features/shared/use-mutation";
import type { Course, Exam, ExamKind } from "@/lib/supabase/database.types";
import { createExam, updateExam, type ExamInput } from "./api";

const KINDS: { id: ExamKind; label: string }[] = [
  { id: "midterm", label: "Midterm" },
  { id: "final", label: "Final" },
  { id: "quiz", label: "Quiz" },
  { id: "practical", label: "Practical" },
  { id: "oral", label: "Oral" },
];

interface FormState {
  title: string;
  course_id: string;
  kind: ExamKind;
  exam_date: string;
  start_time: string;
  end_time: string;
  location: string;
  weight: string;
  preparation: string;
  topics: string;
  notes: string;
}

function toFormState(exam?: Exam): FormState {
  return {
    title: exam?.title ?? "",
    course_id: exam?.course_id ?? "none",
    kind: exam?.kind ?? "midterm",
    exam_date: exam?.exam_date ?? "",
    start_time: exam?.start_time?.slice(0, 5) ?? "",
    end_time: exam?.end_time?.slice(0, 5) ?? "",
    location: exam?.location ?? "",
    weight: exam?.weight?.toString() ?? "",
    preparation: exam?.preparation?.toString() ?? "0",
    topics: exam?.topics.join(", ") ?? "",
    notes: exam?.notes ?? "",
  };
}

function validate(form: FormState) {
  const weight = form.weight.trim() === "" ? null : Number(form.weight);
  const preparation = Number(form.preparation || 0);
  const hasBothTimes = form.start_time !== "" && form.end_time !== "";

  return {
    title: form.title.trim() ? undefined : "Title is required.",
    exam_date: form.exam_date ? undefined : "Date is required.",
    weight:
      weight === null || (Number.isFinite(weight) && weight >= 0 && weight <= 100)
        ? undefined
        : "Weight must be between 0 and 100.",
    preparation:
      Number.isFinite(preparation) && preparation >= 0 && preparation <= 100
        ? undefined
        : "Revision must be between 0 and 100.",
    // Matches the table's `exam_ends_after_it_starts` constraint.
    end_time: !hasBothTimes || form.end_time > form.start_time ? undefined : "End time must be after the start.",
  };
}

export function ExamFormDialog({
  courses,
  exam,
  isOpen,
  onOpenChange,
  onSaved,
}: {
  courses: Course[];
  exam?: Exam;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(exam));
  const [touched, setTouched] = useState(false);


  const errors = validate(form);
  const isFormValid = Object.values(errors).every((message) => message === undefined);

  const { error, isPending, mutate } = useMutation(
    async () => {
      const payload: ExamInput = {
        title: form.title.trim(),
        course_id: form.course_id === "none" ? null : form.course_id,
        kind: form.kind,
        exam_date: form.exam_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.location.trim() || null,
        weight: form.weight.trim() === "" ? null : Number(form.weight),
        preparation: Number(form.preparation || 0),
        topics: form.topics
          .split(",")
          .map((topic) => topic.trim())
          .filter(Boolean),
        notes: form.notes.trim() || null,
      };
      return exam ? updateExam(exam.id, payload) : createExam(payload);
    },
    {
      successMessage: exam ? "Exam updated." : "Exam added.",
      errorMessage: exam ? "Couldn't update the exam" : "Couldn't add the exam",
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
      submitLabel={exam ? "Save changes" : "Add exam"}
      title={exam ? "Edit exam" : "Add an exam"}
    >
      <TextInputField
        errorMessage={touched ? errors.title : undefined}
        isRequired
        label="Title"
        onChange={(value) => set("title", value)}
        placeholder="Algorithms Midterm"
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

        <Select onSelectionChange={(key) => set("kind", String(key) as ExamKind)} selectedKey={form.kind}>
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
          errorMessage={touched ? errors.exam_date : undefined}
          isRequired
          label="Date"
          onChange={(value) => set("exam_date", value)}
          type="date"
          value={form.exam_date}
        />
        <TextInputField label="Start" onChange={(value) => set("start_time", value)} type="time" value={form.start_time} />
        <TextInputField
          errorMessage={touched ? errors.end_time : undefined}
          label="End"
          onChange={(value) => set("end_time", value)}
          type="time"
          value={form.end_time}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TextInputField label="Location" onChange={(value) => set("location", value)} placeholder="Great Hall" value={form.location} />
        <TextInputField
          errorMessage={touched ? errors.weight : undefined}
          hint="% of final grade."
          label="Weight"
          onChange={(value) => set("weight", value)}
          type="number"
          value={form.weight}
        />
        <TextInputField
          errorMessage={touched ? errors.preparation : undefined}
          hint="% revised."
          label="Revision"
          onChange={(value) => set("preparation", value)}
          type="number"
          value={form.preparation}
        />
      </div>

      <TextInputField
        hint="Comma separated."
        label="Topics"
        onChange={(value) => set("topics", value)}
        placeholder="Balanced trees, Shortest paths"
        value={form.topics}
      />

      <TextAreaField label="Notes" onChange={(value) => set("notes", value)} rows={3} value={form.notes} />
    </FormDialog>
  );
}
