"use client";

import { Alert, Button, Chip, Spinner, cn } from "@heroui/react";
import { FileUp, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { GlassSurface } from "@/components/glass/glass-surface";
import { FormDialog } from "@/components/ui/form-dialog";
import { CourseTopicPicker } from "@/features/import/course-topic-picker";
import {
  MAX_CARDS,
  describeImportFile,
  parseFlashcardFile,
  type FlashcardParseResult,
} from "@/features/import/parse-flashcards";
import { useMutation } from "@/features/shared/use-mutation";
import type { Course, Topic } from "@/lib/supabase/database.types";
import { createFlashcards, existingFronts } from "./api";

/**
 * Importing a deck from a file.
 *
 * Select → parse → preview → choose a course → confirm. Everything up to the
 * confirmation happens on the device: the file is read as text and parsed
 * locally, and nothing is uploaded — only the rows the user accepts are sent,
 * as a handful of batched inserts rather than one request per card.
 */
export function ImportFlashcardsDialog({
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
  const [result, setResult] = useState<FlashcardParseResult | undefined>(undefined);
  const [rejectedFile, setRejectedFile] = useState<string | undefined>(undefined);
  const [duplicates, setDuplicates] = useState(0);
  const [courseId, setCourseId] = useState("none");
  const [topicId, setTopicId] = useState("none");
  const [progress, setProgress] = useState<{ done: number; total: number } | undefined>(undefined);

  const analyse = useMutation(
    async (file: File) => {
      const text = await file.text();
      const parsed = parseFlashcardFile(file.name, text);

      // A rough duplicate count, so importing the same deck twice is at least
      // visible. It is a warning, never a filter — two cards may share a front.
      let repeated = 0;
      if (parsed.cards.length > 0) {
        try {
          const existing = await existingFronts();
          repeated = parsed.cards.filter((card) =>
            existing.has(card.front.trim().toLowerCase()),
          ).length;
        } catch {
          // Not being able to check is not a reason to block the import.
        }
      }
      return { parsed, repeated, name: file.name };
    },
    {
      errorMessage: "Couldn't read that file",
      onSuccess: ({ name, parsed, repeated }) => {
        setFileName(name);
        setResult(parsed);
        setDuplicates(repeated);
      },
    },
  );

  const cards = result?.cards ?? [];
  const capped = cards.slice(0, MAX_CARDS);
  const overLimit = cards.length > MAX_CARDS;

  const runImport = useMutation(
    async () =>
      createFlashcards(
        capped.map((card) => ({
          front: card.front,
          back: card.back,
          course_id: courseId === "none" ? null : courseId,
          topic_id: courseId === "none" || topicId === "none" ? null : topicId,
        })),
        (done, total) => setProgress({ done, total }),
      ),
    {
      successMessage: (written) => `Imported ${written} ${written === 1 ? "card" : "cards"}.`,
      errorMessage: "Couldn't import those cards",
      onSuccess: () => {
        setProgress(undefined);
        onOpenChange(false);
        onImported();
      },
    },
  );

  const reset = () => {
    setFileName(undefined);
    setResult(undefined);
    setRejectedFile(undefined);
    setDuplicates(0);
    setProgress(undefined);
  };

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
        if (capped.length > 0) void runImport.mutate();
      }}
      submitLabel={
        capped.length === 0
          ? "Import"
          : `Import ${capped.length} ${capped.length === 1 ? "card" : "cards"}`
      }
      title="Import flashcards"
    >
      {!result ? (
        <>
          <Alert status="accent">
            <Alert.Content>
              <Alert.Title>JSON, CSV or plain text</Alert.Title>
              <Alert.Description>
                The file is read on this device — nothing is uploaded. JSON wants{" "}
                <code>front</code> and <code>back</code>; CSV wants those as column headers; plain
                text wants one card per line separated by a tab, a semicolon or {'" - "'}.
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
              <Chip color="success" size="sm" variant="soft">
                {capped.length} valid
              </Chip>
              {result.rejected.length > 0 ? (
                <Chip color="warning" size="sm" variant="soft">
                  {result.rejected.length} skipped
                </Chip>
              ) : null}
              {duplicates > 0 ? (
                <Chip color="accent" size="sm" variant="soft">
                  {duplicates} already in your deck
                </Chip>
              ) : null}
              <Chip size="sm" variant="soft">
                {result.format.toUpperCase()}
              </Chip>
            </div>
            {overLimit ? (
              <p className="mt-2 text-xs text-warning">
                Only the first {MAX_CARDS} cards will be imported.
              </p>
            ) : null}
          </GlassSurface>

          {capped.length === 0 ? (
            <Alert status="warning">
              <Alert.Content>
                <Alert.Description>
                  Nothing in that file could be read as a card. The rows below say why.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Preview</p>
              <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto overscroll-contain">
                {capped.slice(0, 20).map((card, index) => (
                  <li key={index}>
                    <GlassSurface className="p-3" radius="sm" tone="subtle">
                      <p className="text-sm font-medium text-foreground">{card.front}</p>
                      <p className="mt-1 text-sm text-muted">{card.back}</p>
                    </GlassSurface>
                  </li>
                ))}
                {capped.length > 20 ? (
                  <li className="py-1 text-center text-xs text-muted">
                    …and {capped.length - 20} more
                  </li>
                ) : null}
              </ul>
            </div>
          )}

          {result.rejected.length > 0 ? (
            <details className="rounded-[var(--radius-glass)] border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                {result.rejected.length} skipped {result.rejected.length === 1 ? "row" : "rows"}
              </summary>
              <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto text-xs text-muted">
                {result.rejected.slice(0, 50).map((row) => (
                  <li key={row.line}>
                    <span className="tabular font-medium">Line {row.line}</span> — {row.reason}{" "}
                    <span className="opacity-70">{row.preview}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <CourseTopicPicker
            courseId={courseId}
            courses={courses}
            onCourseChange={setCourseId}
            onTopicChange={setTopicId}
            topicId={topicId}
            topics={topics}
          />

          {progress ? (
            <div className="flex flex-col gap-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
                <div
                  className={cn("h-full rounded-full bg-accent transition-[width] duration-200")}
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
              <p className="tabular text-xs text-muted">
                {progress.done} of {progress.total} written
              </p>
            </div>
          ) : (
            <Button onPress={reset} size="sm" variant="tertiary">
              <Upload aria-hidden="true" className="size-3.5" strokeWidth={2} />
              Choose a different file
            </Button>
          )}
        </>
      )}

      <input
        accept=".json,.csv,.tsv,.txt,.md,application/json,text/csv,text/plain"
        aria-hidden="true"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;

          const problem = describeImportFile(file);
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
