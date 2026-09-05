"use client";

import { Label, ListBox, Select, Switch } from "@heroui/react";
import { useState } from "react";
import { TextAreaField, TextInputField } from "@/components/form/text-field";
import { FormDialog } from "@/components/ui/form-dialog";
import { useMutation } from "@/features/shared/use-mutation";
import type { Course, Note } from "@/lib/supabase/database.types";
import { createNote, updateNote, type NoteInput } from "./api";

interface FormState {
  title: string;
  content: string;
  course_id: string;
  tags: string;
  is_pinned: boolean;
}

function toFormState(note?: Note): FormState {
  return {
    title: note?.title ?? "",
    content: note?.content ?? "",
    course_id: note?.course_id ?? "none",
    tags: note?.tags.join(", ") ?? "",
    is_pinned: note?.is_pinned ?? false,
  };
}

export function NoteFormDialog({
  courses,
  isOpen,
  note,
  onOpenChange,
  onSaved,
}: {
  courses: Course[];
  isOpen: boolean;
  note?: Note;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(note));
  const [touched, setTouched] = useState(false);


  const titleError = form.title.trim() ? undefined : "Title is required.";

  const { error, isPending, mutate } = useMutation(
    async () => {
      const payload: NoteInput = {
        title: form.title.trim(),
        content: form.content,
        course_id: form.course_id === "none" ? null : form.course_id,
        topic_id: note?.topic_id ?? null,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        is_pinned: form.is_pinned,
      };
      return note ? updateNote(note.id, payload) : createNote(payload);
    },
    {
      successMessage: note ? "Note saved." : "Note created.",
      errorMessage: note ? "Couldn't save the note" : "Couldn't create the note",
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
        if (!titleError) void mutate();
      }}
      submitLabel={note ? "Save note" : "Create note"}
      title={note ? "Edit note" : "New note"}
    >
      <TextInputField
        errorMessage={touched ? titleError : undefined}
        isRequired
        label="Title"
        onChange={(value) => set("title", value)}
        placeholder="Amortised analysis — three methods"
        value={form.title}
      />

      <TextAreaField
        label="Note"
        onChange={(value) => set("content", value)}
        placeholder="What you want to remember…"
        rows={8}
        value={form.content}
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

        <TextInputField
          hint="Comma separated."
          label="Tags"
          onChange={(value) => set("tags", value)}
          placeholder="midterm, proofs"
          value={form.tags}
        />
      </div>

      <Switch isSelected={form.is_pinned} onChange={(selected) => set("is_pinned", selected)}>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Label>Pin to the top</Label>
        </Switch.Content>
      </Switch>
    </FormDialog>
  );
}
