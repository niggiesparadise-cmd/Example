"use client";

import { Label, ListBox, Select } from "@heroui/react";
import { useState } from "react";
import { TextAreaField } from "@/components/form/text-field";
import { FormDialog } from "@/components/ui/form-dialog";
import { useMutation } from "@/features/shared/use-mutation";
import type { Course, Flashcard, Topic } from "@/lib/supabase/database.types";
import { createFlashcard, updateFlashcard, type FlashcardInput } from "./api";

interface FormState {
  front: string;
  back: string;
  course_id: string;
  topic_id: string;
}

function toFormState(card?: Flashcard): FormState {
  return {
    front: card?.front ?? "",
    back: card?.back ?? "",
    course_id: card?.course_id ?? "none",
    topic_id: card?.topic_id ?? "none",
  };
}

/** Mirrors the table's CHECK constraints so an invalid card never leaves the client. */
function validate(form: FormState) {
  return {
    front: form.front.trim() ? undefined : "The question is required.",
    back: form.back.trim() ? undefined : "The answer is required.",
  };
}

export function FlashcardFormDialog({
  card,
  courses,
  isOpen,
  onOpenChange,
  onSaved,
  topics,
}: {
  card?: Flashcard;
  courses: Course[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  topics: Topic[];
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(card));
  const [touched, setTouched] = useState(false);

  const errors = validate(form);
  const isFormValid = Object.values(errors).every((message) => message === undefined);

  // A topic belongs to a course, so the list narrows once a course is chosen.
  const availableTopics =
    form.course_id === "none" ? [] : topics.filter((topic) => topic.course_id === form.course_id);

  const { error, isPending, mutate } = useMutation(
    async () => {
      const payload: FlashcardInput = {
        front: form.front.trim(),
        back: form.back.trim(),
        course_id: form.course_id === "none" ? null : form.course_id,
        // A topic without its course would be an orphan reference.
        topic_id: form.course_id === "none" || form.topic_id === "none" ? null : form.topic_id,
      };
      return card ? updateFlashcard(card.id, payload) : createFlashcard(payload);
    },
    {
      successMessage: card ? "Card updated." : "Card added.",
      errorMessage: card ? "Couldn't update the card" : "Couldn't add the card",
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
      submitLabel={card ? "Save changes" : "Add card"}
      title={card ? "Edit card" : "Add a card"}
    >
      <TextAreaField
        errorMessage={touched ? errors.front : undefined}
        hint="What you want to be asked."
        isRequired
        label="Question"
        onChange={(value) => set("front", value)}
        placeholder="Which enzyme does aspirin inhibit?"
        rows={3}
        value={form.front}
      />
      <TextAreaField
        errorMessage={touched ? errors.back : undefined}
        isRequired
        label="Answer"
        onChange={(value) => set("back", value)}
        placeholder="Cyclo-oxygenase (COX-1 and COX-2), irreversibly."
        rows={3}
        value={form.back}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          onSelectionChange={(key) => {
            set("course_id", String(key));
            // The previously chosen topic belongs to the previous course.
            set("topic_id", "none");
          }}
          selectedKey={form.course_id}
        >
          <Label>Course</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="none" textValue="No course">
                No course
              </ListBox.Item>
              {courses.map((course) => (
                <ListBox.Item id={course.id} key={course.id} textValue={course.code}>
                  {course.code}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          isDisabled={availableTopics.length === 0}
          onSelectionChange={(key) => set("topic_id", String(key))}
          selectedKey={form.topic_id}
        >
          <Label>Topic</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="none" textValue="No topic">
                No topic
              </ListBox.Item>
              {availableTopics.map((topic) => (
                <ListBox.Item id={topic.id} key={topic.id} textValue={topic.title}>
                  {topic.title}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
    </FormDialog>
  );
}
