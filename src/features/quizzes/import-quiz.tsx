"use client";

import { Alert, Button, Chip, Input, Spinner, TextField, cn } from "@heroui/react";
import { AlertTriangle, ChevronLeft, ChevronRight, Check, FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { GlassSurface } from "@/components/glass/glass-surface";
import { TextAreaField, TextInputField } from "@/components/form/text-field";
import { FormDialog } from "@/components/ui/form-dialog";
import { CourseTopicPicker } from "@/features/import/course-topic-picker";
import {
  MAX_QUESTIONS,
  MAX_QUIZ_BYTES,
  parseQuizHtml,
  parseQuizPdf,
  parseQuizText,
  problemWith,
  type DraftQuestion,
  type QuizParseResult,
} from "@/features/import/parse-quiz";
import { useMutation } from "@/features/shared/use-mutation";
import type { Course, Topic } from "@/lib/supabase/database.types";
import { createQuiz, replaceQuestions, type QuestionDraft } from "./api";

/**
 * Importing a quiz from an HTML or PDF file.
 *
 * The file is parsed on the device and never uploaded. HTML goes through
 * `DOMParser`, which builds a detached document — scripts in it never run and
 * only `textContent` is read out, so an imported file cannot reach the app or
 * its Supabase session. PDFs are read for their text layer; a scan is reported
 * as a scan rather than turned into plausible-looking nonsense.
 *
 * Nothing is written until the user has seen every question. Ones the parser
 * could not resolve are marked, and each is editable in place — a question the
 * importer got wrong should be correctable, not silently imported.
 */
export function ImportQuizDialog({
  courses,
  isOpen,
  onImported,
  onOpenChange,
  topics,
}: {
  courses: Course[];
  isOpen: boolean;
  onImported: () => void;
  onOpenChange: (open: boolean) => void;
  topics: Topic[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<QuizParseResult | undefined>(undefined);
  const [drafts, setDrafts] = useState<DraftQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [title, setTitle] = useState("");
  const [rejectedFile, setRejectedFile] = useState<string | undefined>(undefined);
  const [courseId, setCourseId] = useState("none");
  const [topicId, setTopicId] = useState("none");

  const analyse = useMutation(
    async (file: File) => {
      const lower = file.name.toLowerCase();
      let parsed: QuizParseResult;

      if (lower.endsWith(".pdf")) {
        parsed = await parseQuizPdf(file);
      } else if (lower.endsWith(".html") || lower.endsWith(".htm")) {
        parsed = parseQuizHtml(await file.text());
      } else {
        parsed = parseQuizText(await file.text());
      }
      return { parsed, name: file.name };
    },
    {
      errorMessage: "Couldn't read that file",
      onSuccess: ({ name, parsed }) => {
        setFileName(name);
        setResult(parsed);
        setDrafts(parsed.questions);
        setIndex(0);
        // A sensible default the user can overwrite.
        setTitle(name.replace(/\.(pdf|html?|txt|md)$/i, "").replace(/[_-]+/g, " ").trim());
      },
    },
  );

  const ready = drafts.filter((draft) => !problemWith(draft));
  const needsReview = drafts.length - ready.length;

  const runImport = useMutation(
    async () => {
      const quiz = await createQuiz({
        title: title.trim() || "Imported quiz",
        description: fileName ? `Imported from ${fileName}` : null,
        course_id: courseId === "none" ? null : courseId,
        topic_id: courseId === "none" || topicId === "none" ? null : topicId,
      });

      // Only the questions that survived review are written.
      const payload: QuestionDraft[] = ready.map((draft) => ({
        question: draft.question.trim(),
        kind: "multiple-choice",
        explanation: draft.explanation,
        options: draft.options.map((text, optionIndex) => ({
          option_text: text.trim(),
          is_correct: optionIndex === draft.correctIndex,
        })),
      }));

      await replaceQuestions(quiz.id, payload);
      return payload.length;
    },
    {
      successMessage: (count) => `Imported ${count} ${count === 1 ? "question" : "questions"}.`,
      errorMessage: "Couldn't import that quiz",
      onSuccess: () => {
        onOpenChange(false);
        onImported();
      },
    },
  );

  const reset = () => {
    setFileName(undefined);
    setResult(undefined);
    setDrafts([]);
    setIndex(0);
    setRejectedFile(undefined);
  };

  const patch = (change: Partial<DraftQuestion>) =>
    setDrafts((previous) =>
      previous.map((draft, i) => (i === index ? { ...draft, ...change } : draft)),
    );

  const current = drafts[index];

  return (
    <FormDialog
      error={runImport.error}
      isOpen={isOpen}
      isPending={runImport.isPending}
      onOpenChange={(open) => {
        if (!open) reset();
        onOpenChange(open);
      }}
      onSubmit={() => {
        if (ready.length > 0) void runImport.mutate();
      }}
      submitLabel={
        ready.length === 0
          ? "Import"
          : `Import ${ready.length} ${ready.length === 1 ? "question" : "questions"}`
      }
      title="Import a quiz"
    >
      {!result ? (
        <>
          <Alert status="accent">
            <Alert.Content>
              <Alert.Title>HTML, PDF or plain text</Alert.Title>
              <Alert.Description>
                Read on this device — nothing is uploaded, and nothing in the file is executed. The
                importer looks for a question followed by lettered options, and a line like{" "}
                <code>Answer: B</code>.
              </Alert.Description>
            </Alert.Content>
          </Alert>

          {rejectedFile ? (
            <Alert status="warning">
              <Alert.Content>
                <Alert.Description>{rejectedFile}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <Button
            isDisabled={analyse.isPending}
            onPress={() => inputRef.current?.click()}
            size="lg"
            variant="secondary"
          >
            {analyse.isPending ? <Spinner size="sm" /> : <FileUp aria-hidden="true" className="size-4" strokeWidth={2} />}
            {analyse.isPending ? "Reading…" : "Choose a file"}
          </Button>
        </>
      ) : result.fatal ? (
        <>
          <Alert status="danger">
            <Alert.Content>
              <Alert.Title>Couldn&apos;t read {fileName}</Alert.Title>
              <Alert.Description>{result.fatal}</Alert.Description>
            </Alert.Content>
          </Alert>
          <Button onPress={reset} variant="secondary">
            Choose a different file
          </Button>
        </>
      ) : (
        <>
          <GlassSurface className="p-4" tone="subtle">
            <p className="truncate text-sm font-semibold text-foreground">{fileName}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip size="sm" variant="soft">
                {drafts.length} detected
              </Chip>
              <Chip color="success" size="sm" variant="soft">
                {ready.length} ready
              </Chip>
              {needsReview > 0 ? (
                <Chip color="warning" size="sm" variant="soft">
                  {needsReview} need review
                </Chip>
              ) : null}
            </div>
            {result.warnings.map((warning) => (
              <p className="mt-2 text-xs text-muted" key={warning}>
                {warning}
              </p>
            ))}
            {drafts.length >= MAX_QUESTIONS ? (
              <p className="mt-2 text-xs text-warning">
                Stopped at the {MAX_QUESTIONS}-question limit.
              </p>
            ) : null}
          </GlassSurface>

          <TextInputField
            isRequired
            label="Quiz title"
            onChange={setTitle}
            placeholder="Pharmacology final"
            value={title}
          />

          <CourseTopicPicker
            courseId={courseId}
            courses={courses}
            onCourseChange={setCourseId}
            onTopicChange={setTopicId}
            topicId={topicId}
            topics={topics}
          />

          {current ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                  Question {index + 1} of {drafts.length}
                </p>
                <div className="flex gap-1">
                  <Button
                    aria-label="Previous question"
                    isDisabled={index === 0}
                    isIconOnly
                    onPress={() => setIndex((previous) => previous - 1)}
                    size="sm"
                    variant="ghost"
                  >
                    <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={2} />
                  </Button>
                  <Button
                    aria-label="Next question"
                    isDisabled={index >= drafts.length - 1}
                    isIconOnly
                    onPress={() => setIndex((previous) => previous + 1)}
                    size="sm"
                    variant="ghost"
                  >
                    <ChevronRight aria-hidden="true" className="size-4" strokeWidth={2} />
                  </Button>
                </div>
              </div>

              {problemWith(current) ? (
                <Alert status="warning">
                  <Alert.Content>
                    <Alert.Title>
                      <span className="inline-flex items-center gap-1.5">
                        <AlertTriangle aria-hidden="true" className="size-3.5" strokeWidth={2.1} />
                        Needs review
                      </span>
                    </Alert.Title>
                    <Alert.Description>
                      {problemWith(current)} Fix it here, or leave it — only the questions marked
                      ready are imported.
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              <TextAreaField
                label="Question"
                onChange={(value) => patch({ question: value })}
                rows={2}
                value={current.question}
              />

              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted">Tap the circle to mark the correct answer.</p>
                {current.options.map((option, optionIndex) => (
                  <div className="flex items-center gap-2" key={optionIndex}>
                    <button
                      aria-label={`Mark option ${optionIndex + 1} correct`}
                      aria-pressed={current.correctIndex === optionIndex}
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors",
                        "outline-none focus-visible:ring-2 focus-visible:ring-focus",
                        current.correctIndex === optionIndex
                          ? "border-success bg-success text-white"
                          : "border-border text-transparent hover:border-muted",
                      )}
                      onClick={() => patch({ correctIndex: optionIndex })}
                      type="button"
                    >
                      <Check aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
                    </button>
                    <TextField
                      aria-label={`Option ${optionIndex + 1}`}
                      className="flex-1"
                      onChange={(value) =>
                        patch({
                          options: current.options.map((each, i) => (i === optionIndex ? value : each)),
                        })
                      }
                      validationBehavior="aria"
                      value={option}
                    >
                      <Input />
                    </TextField>
                  </div>
                ))}
              </div>

              <TextAreaField
                hint="Shown after answering. Optional."
                label="Explanation"
                onChange={(value) => patch({ explanation: value || null })}
                rows={2}
                value={current.explanation ?? ""}
              />
            </div>
          ) : null}

          <Button onPress={reset} size="sm" variant="tertiary">
            Choose a different file
          </Button>
        </>
      )}

      <input
        accept=".html,.htm,.pdf,.txt,.md,text/html,application/pdf,text/plain"
        aria-hidden="true"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;

          const problem =
            file.size === 0
              ? "That file is empty."
              : file.size > MAX_QUIZ_BYTES
                ? "That file is larger than 10 MB."
                : undefined;
          setRejectedFile(problem);
          if (!problem) void analyse.mutate(file);
        }}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
    </FormDialog>
  );
}
