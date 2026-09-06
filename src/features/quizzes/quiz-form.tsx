"use client";

import { Alert, Button, Input, Label, ListBox, Select, TextField, cn } from "@heroui/react";
import { Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { TextAreaField, TextInputField } from "@/components/form/text-field";
import { FormDialog } from "@/components/ui/form-dialog";
import { useMutation } from "@/features/shared/use-mutation";
import type { Course, Quiz, QuizQuestionKind, Topic } from "@/lib/supabase/database.types";
import { createQuiz, replaceQuestions, updateQuiz, type FullQuiz, type QuestionDraft } from "./api";

/**
 * Building a quiz.
 *
 * Questions are edited inline rather than behind a second dialog: a quiz with
 * four questions is a single thought, and making the author open and close a
 * modal per question turns it into four.
 *
 * True/false questions get their two options generated, so the author picks
 * which one is true rather than typing "True" and "False" every time.
 */

function blankQuestion(): QuestionDraft {
  return {
    question: "",
    kind: "multiple-choice",
    explanation: null,
    options: [
      { option_text: "", is_correct: true },
      { option_text: "", is_correct: false },
    ],
  };
}

function trueFalseOptions(correct: "true" | "false"): QuestionDraft["options"] {
  return [
    { option_text: "True", is_correct: correct === "true" },
    { option_text: "False", is_correct: correct === "false" },
  ];
}

function fromExisting(full: FullQuiz): QuestionDraft[] {
  return full.questions.map((question) => ({
    id: question.id,
    question: question.question,
    kind: question.kind,
    explanation: question.explanation,
    options: question.options.map((option) => ({
      id: option.id,
      option_text: option.option_text,
      is_correct: option.is_correct,
    })),
  }));
}

/** Every rule the database would enforce, checked before the round trip. */
function problemsWith(title: string, drafts: QuestionDraft[]): string[] {
  const problems: string[] = [];
  if (!title.trim()) problems.push("The quiz needs a title.");
  if (drafts.length === 0) problems.push("Add at least one question.");

  drafts.forEach((draft, index) => {
    const label = `Question ${index + 1}`;
    if (!draft.question.trim()) problems.push(`${label} has no text.`);
    const filled = draft.options.filter((option) => option.option_text.trim());
    if (filled.length < 2) problems.push(`${label} needs at least two answers.`);
    if (!draft.options.some((option) => option.is_correct && option.option_text.trim())) {
      problems.push(`${label} has no correct answer marked.`);
    }
  });

  return problems;
}

export function QuizFormDialog({
  courses,
  existing,
  isOpen,
  onOpenChange,
  onSaved,
  topics,
}: {
  courses: Course[];
  existing?: FullQuiz;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  topics: Topic[];
}) {
  const [title, setTitle] = useState(existing?.quiz.title ?? "");
  const [description, setDescription] = useState(existing?.quiz.description ?? "");
  const [courseId, setCourseId] = useState(existing?.quiz.course_id ?? "none");
  const [topicId, setTopicId] = useState(existing?.quiz.topic_id ?? "none");
  const [drafts, setDrafts] = useState<QuestionDraft[]>(() =>
    existing ? fromExisting(existing) : [blankQuestion()],
  );
  const [touched, setTouched] = useState(false);

  const problems = problemsWith(title, drafts);
  const availableTopics = courseId === "none" ? [] : topics.filter((t) => t.course_id === courseId);

  const { error, isPending, mutate } = useMutation(
    async () => {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        course_id: courseId === "none" ? null : courseId,
        topic_id: courseId === "none" || topicId === "none" ? null : topicId,
      };

      const quiz: Quiz = existing
        ? await updateQuiz(existing.quiz.id, payload)
        : await createQuiz(payload);

      // Blank trailing options are a side effect of editing, not content.
      await replaceQuestions(
        quiz.id,
        drafts.map((draft) => ({
          ...draft,
          options: draft.options.filter((option) => option.option_text.trim()),
        })),
      );
      return quiz;
    },
    {
      successMessage: existing ? "Quiz updated." : "Quiz created.",
      errorMessage: existing ? "Couldn't update the quiz" : "Couldn't create the quiz",
      onSuccess: () => {
        onOpenChange(false);
        onSaved();
      },
    },
  );

  const patch = (index: number, change: Partial<QuestionDraft>) =>
    setDrafts((previous) =>
      previous.map((draft, i) => (i === index ? { ...draft, ...change } : draft)),
    );

  return (
    <FormDialog
      error={error}
      isOpen={isOpen}
      isPending={isPending}
      onOpenChange={onOpenChange}
      onSubmit={() => {
        setTouched(true);
        if (problems.length === 0) void mutate();
      }}
      submitLabel={existing ? "Save quiz" : "Create quiz"}
      title={existing ? "Edit quiz" : "New quiz"}
    >
      {touched && problems.length > 0 ? (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>Not quite ready</Alert.Title>
            <Alert.Description>
              <ul className="list-disc pl-4">
                {problems.slice(0, 4).map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <TextInputField
        isRequired
        label="Title"
        onChange={setTitle}
        placeholder="Pharmacology — autonomic drugs"
        value={title}
      />
      <TextAreaField
        label="Description"
        onChange={setDescription}
        placeholder="Optional — what this quiz covers."
        rows={2}
        value={description}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          onSelectionChange={(key) => {
            setCourseId(String(key));
            setTopicId("none");
          }}
          selectedKey={courseId}
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
          onSelectionChange={(key) => setTopicId(String(key))}
          selectedKey={topicId}
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

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            Questions ({drafts.length})
          </p>
          <Button
            onPress={() => setDrafts((previous) => [...previous, blankQuestion()])}
            size="sm"
            variant="secondary"
          >
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />
            Add question
          </Button>
        </div>

        {drafts.map((draft, index) => (
          <div
            className="flex flex-col gap-3 rounded-[var(--radius-glass)] border border-border bg-surface-secondary p-3"
            key={index}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-muted">Question {index + 1}</span>
              {drafts.length > 1 ? (
                <Button
                  aria-label={`Remove question ${index + 1}`}
                  isIconOnly
                  onPress={() => setDrafts((previous) => previous.filter((_, i) => i !== index))}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 aria-hidden="true" className="size-3.5" strokeWidth={1.9} />
                </Button>
              ) : null}
            </div>

            <TextAreaField
              label="Question"
              onChange={(value) => patch(index, { question: value })}
              placeholder="Which mechanism explains…?"
              rows={2}
              value={draft.question}
            />

            <Select
              onSelectionChange={(key) => {
                const kind = String(key) as QuizQuestionKind;
                patch(index, {
                  kind,
                  options: kind === "true-false" ? trueFalseOptions("true") : blankQuestion().options,
                });
              }}
              selectedKey={draft.kind}
            >
              <Label>Type</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="multiple-choice" textValue="Multiple choice">
                    Multiple choice
                  </ListBox.Item>
                  <ListBox.Item id="true-false" textValue="True or false">
                    True or false
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>

            {draft.kind === "true-false" ? (
              <div className="flex flex-col gap-1.5">
                <Label>Correct answer</Label>
                <div className="flex gap-2">
                  {(["true", "false"] as const).map((value) => {
                    const isCorrect =
                      draft.options.find((option) => option.option_text === (value === "true" ? "True" : "False"))
                        ?.is_correct ?? false;
                    return (
                      <Button
                        key={value}
                        onPress={() => patch(index, { options: trueFalseOptions(value) })}
                        size="sm"
                        variant={isCorrect ? "primary" : "secondary"}
                      >
                        {isCorrect ? <Check aria-hidden="true" className="size-3.5" strokeWidth={2.4} /> : null}
                        {value === "true" ? "True" : "False"}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Label>Answers — tap the circle to mark the correct one</Label>
                {draft.options.map((option, optionIndex) => (
                  <div className="flex items-center gap-2" key={optionIndex}>
                    <button
                      aria-label={`Mark answer ${optionIndex + 1} correct`}
                      aria-pressed={option.is_correct}
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors",
                        "outline-none focus-visible:ring-2 focus-visible:ring-focus",
                        option.is_correct
                          ? "border-success bg-success text-white"
                          : "border-border text-transparent hover:border-muted",
                      )}
                      onClick={() =>
                        // Exactly one correct answer per question.
                        patch(index, {
                          options: draft.options.map((each, i) => ({
                            ...each,
                            is_correct: i === optionIndex,
                          })),
                        })
                      }
                      type="button"
                    >
                      <Check aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
                    </button>

                    <TextField
                      aria-label={`Answer ${optionIndex + 1}`}
                      className="flex-1"
                      onChange={(value) =>
                        patch(index, {
                          options: draft.options.map((each, i) =>
                            i === optionIndex ? { ...each, option_text: value } : each,
                          ),
                        })
                      }
                      validationBehavior="aria"
                      value={option.option_text}
                    >
                      <Input placeholder={`Answer ${optionIndex + 1}`} />
                    </TextField>

                    {draft.options.length > 2 ? (
                      <Button
                        aria-label={`Remove answer ${optionIndex + 1}`}
                        isIconOnly
                        onPress={() =>
                          patch(index, {
                            options: draft.options.filter((_, i) => i !== optionIndex),
                          })
                        }
                        size="sm"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" className="size-3.5" strokeWidth={1.9} />
                      </Button>
                    ) : null}
                  </div>
                ))}

                {draft.options.length < 6 ? (
                  <Button
                    className="self-start"
                    onPress={() =>
                      patch(index, {
                        options: [...draft.options, { option_text: "", is_correct: false }],
                      })
                    }
                    size="sm"
                    variant="tertiary"
                  >
                    <Plus aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
                    Add answer
                  </Button>
                ) : null}
              </div>
            )}

            <TextAreaField
              hint="Shown after answering, right or wrong."
              label="Explanation"
              onChange={(value) => patch(index, { explanation: value })}
              rows={2}
              value={draft.explanation ?? ""}
            />
          </div>
        ))}
      </div>
    </FormDialog>
  );
}
