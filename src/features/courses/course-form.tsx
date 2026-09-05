"use client";

import { Label, ListBox, Select } from "@heroui/react";
import { useState } from "react";
import { TextAreaField, TextInputField } from "@/components/form/text-field";
import { FormDialog } from "@/components/ui/form-dialog";
import { useMutation } from "@/features/shared/use-mutation";
import type { ColorSlot, Course } from "@/lib/supabase/database.types";
import { createCourse, updateCourse, type CourseInput } from "./api";

const COLOR_NAMES: Record<ColorSlot, string> = {
  1: "Blue",
  2: "Orange",
  3: "Teal",
  4: "Amber",
  5: "Pink",
};

interface FormState {
  code: string;
  title: string;
  instructor: string;
  credits: string;
  location: string;
  color_slot: ColorSlot;
  grade: string;
  summary: string;
}

function toFormState(course?: Course): FormState {
  return {
    code: course?.code ?? "",
    title: course?.title ?? "",
    instructor: course?.instructor ?? "",
    credits: course?.credits?.toString() ?? "",
    location: course?.location ?? "",
    color_slot: course?.color_slot ?? 1,
    grade: course?.grade?.toString() ?? "",
    summary: course?.summary ?? "",
  };
}

/** Validation mirrors the database CHECK constraints, so nothing invalid is sent. */
function validate(form: FormState) {
  const credits = form.credits.trim() === "" ? null : Number(form.credits);
  const grade = form.grade.trim() === "" ? null : Number(form.grade);

  return {
    code: form.code.trim() ? undefined : "Course code is required.",
    title: form.title.trim() ? undefined : "Title is required.",
    credits:
      credits === null || (Number.isFinite(credits) && credits >= 0 && credits <= 60)
        ? undefined
        : "Credits must be a number between 0 and 60.",
    grade:
      grade === null || (Number.isFinite(grade) && grade >= 0 && grade <= 100)
        ? undefined
        : "Grade must be a number between 0 and 100.",
  };
}

export function CourseFormDialog({
  course,
  isOpen,
  onOpenChange,
  onSaved,
}: {
  course?: Course;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(course));
  const [touched, setTouched] = useState(false);


  const errors = validate(form);
  const isFormValid = Object.values(errors).every((message) => message === undefined);

  const { error, isPending, mutate } = useMutation(
    async () => {
      const payload: CourseInput = {
        code: form.code.trim(),
        title: form.title.trim(),
        instructor: form.instructor.trim() || null,
        credits: form.credits.trim() === "" ? null : Number(form.credits),
        location: form.location.trim() || null,
        color_slot: form.color_slot,
        grade: form.grade.trim() === "" ? null : Number(form.grade),
        attendance: course?.attendance ?? null,
        summary: form.summary.trim() || null,
      };
      return course ? updateCourse(course.id, payload) : createCourse(payload);
    },
    {
      successMessage: course ? "Course updated." : "Course added.",
      errorMessage: course ? "Couldn't update the course" : "Couldn't add the course",
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
      submitLabel={course ? "Save changes" : "Add course"}
      title={course ? "Edit course" : "Add a course"}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInputField
          errorMessage={touched ? errors.code : undefined}
          isRequired
          label="Course code"
          onChange={(value) => set("code", value)}
          placeholder="CS 3410"
          value={form.code}
        />
        <TextInputField
          errorMessage={touched ? errors.credits : undefined}
          label="Credits"
          onChange={(value) => set("credits", value)}
          placeholder="4"
          type="number"
          value={form.credits}
        />
      </div>

      <TextInputField
        errorMessage={touched ? errors.title : undefined}
        isRequired
        label="Title"
        onChange={(value) => set("title", value)}
        placeholder="Data Structures & Algorithms"
        value={form.title}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInputField
          label="Instructor"
          onChange={(value) => set("instructor", value)}
          placeholder="Prof. Elena Márquez"
          value={form.instructor}
        />
        <TextInputField
          label="Location"
          onChange={(value) => set("location", value)}
          placeholder="Turing Hall 204"
          value={form.location}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          onSelectionChange={(key) => set("color_slot", Number(key) as ColorSlot)}
          selectedKey={String(form.color_slot)}
        >
          <Label>Colour</Label>
          <Select.Trigger />
          <Select.Popover>
            <ListBox>
              {(Object.keys(COLOR_NAMES) as unknown as ColorSlot[]).map((slot) => (
                <ListBox.Item key={slot} id={String(slot)} textValue={COLOR_NAMES[slot]}>
                  {COLOR_NAMES[slot]}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <TextInputField
          errorMessage={touched ? errors.grade : undefined}
          hint="Running average, 0–100."
          label="Grade"
          onChange={(value) => set("grade", value)}
          placeholder="91"
          type="number"
          value={form.grade}
        />
      </div>

      <TextAreaField
        label="Summary"
        onChange={(value) => set("summary", value)}
        placeholder="What this course covers."
        rows={3}
        value={form.summary}
      />
    </FormDialog>
  );
}
