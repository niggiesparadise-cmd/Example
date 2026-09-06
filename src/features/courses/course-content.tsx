"use client";

import { Button, Checkbox, cn, Disclosure, Input, Label, TextField } from "@heroui/react";
import { Check, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { ErrorState, ListSkeleton } from "@/components/ui/data-states";
import { TopicSublectures } from "./topic-sublectures";
import { useMutation } from "@/features/shared/use-mutation";
import { useQuery } from "@/features/shared/use-query";
import type { Lecture, Topic } from "@/lib/supabase/database.types";
import { formatDayMonth } from "@/lib/date";
import {
  createLecture,
  createTopic,
  deleteLecture,
  deleteTopic,
  listLectures,
  listTopics,
  setTopicComplete,
  updateLecture,
  updateTopic,
} from "./api";

/**
 * A course's topic checklist and its lecture list.
 *
 * Both are loaded lazily when the disclosure opens: a courses page with ten
 * cards should not fire twenty queries nobody asked for. Topics are what drive
 * the course's progress bar — the percentage is derived from them and never
 * stored, so ticking one here is the only way that number moves.
 */
export function CourseContent({
  courseId,
  onChanged,
}: {
  courseId: string;
  onChanged: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const topics = useQuery(async () => listTopics(courseId), [courseId], {
    enabled: isOpen,
  });
  const lectures = useQuery(async () => listLectures(courseId), [courseId], {
    enabled: isOpen,
  });

  return (
    <Disclosure isExpanded={isOpen} onExpandedChange={setIsOpen}>
      <Disclosure.Heading>
        <Disclosure.Trigger className="flex w-full items-center gap-2 text-sm font-medium text-muted hover:text-foreground">
          Topics and lectures
          <Disclosure.Indicator />
        </Disclosure.Trigger>
      </Disclosure.Heading>

      <Disclosure.Content>
        <Disclosure.Body className="flex flex-col gap-5 pt-1">
          <TopicList courseId={courseId} onChanged={onChanged} query={topics} />
          <LectureList courseId={courseId} query={lectures} />
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}

type QueryOf<T> = ReturnType<typeof useQuery<T[]>>;

function TopicList({
  courseId,
  onChanged,
  query,
}: {
  courseId: string;
  onChanged: () => void;
  query: QueryOf<Topic>;
}) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [editingTitle, setEditingTitle] = useState("");
  // Which topics have their sublectures showing. Collapsed by default.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  // Topics move the progress bar, so the courses list has to be told as well.
  const refresh = async () => {
    await query.refetch();
    onChanged();
  };

  const toggle = useMutation(
    async (id: string, complete: boolean) => setTopicComplete(id, complete),
    {
      errorMessage: "Couldn't update the topic",
      onSuccess: refresh,
    },
  );

  const add = useMutation(
    async () =>
      createTopic({
        course_id: courseId,
        title: draft.trim(),
        position: query.data?.length ?? 0,
        is_complete: false,
      }),
    {
      successMessage: "Topic added.",
      errorMessage: "Couldn't add the topic",
      onSuccess: async () => {
        setDraft("");
        await refresh();
      },
    },
  );

  const rename = useMutation(
    async (id: string, title: string) => updateTopic(id, { title }),
    {
      successMessage: "Topic renamed.",
      errorMessage: "Couldn't rename the topic",
      onSuccess: async () => {
        setEditingId(undefined);
        await refresh();
      },
    },
  );

  const remove = useMutation(async (id: string) => deleteTopic(id), {
    successMessage: "Topic removed.",
    errorMessage: "Couldn't remove the topic",
    onSuccess: refresh,
  });

  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold tracking-wide text-muted uppercase">
        Topics
      </h4>

      {query.isLoading ? (
        <ListSkeleton rows={3} />
      ) : query.error ? (
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          title="Couldn't load topics"
        />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {(query.data ?? []).map((topic) =>
            editingId === topic.id ? (
              <li key={topic.id}>
                <form
                  className="flex items-center gap-2"
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (editingTitle.trim())
                      void rename.mutate(topic.id, editingTitle.trim());
                  }}
                >
                  <TextField
                    aria-label={`Rename ${topic.title}`}
                    className="flex-1"
                    onChange={setEditingTitle}
                    validationBehavior="aria"
                    value={editingTitle}
                  >
                    <Input autoFocus />
                  </TextField>
                  <Button
                    aria-label="Save name"
                    isDisabled={rename.isPending || !editingTitle.trim()}
                    isIconOnly
                    size="sm"
                    type="submit"
                    variant="secondary"
                  >
                    <Check
                      aria-hidden="true"
                      className="size-3.5"
                      strokeWidth={2}
                    />
                  </Button>
                  <Button
                    aria-label="Cancel rename"
                    isIconOnly
                    onPress={() => setEditingId(undefined)}
                    size="sm"
                    variant="ghost"
                  >
                    <X
                      aria-hidden="true"
                      className="size-3.5"
                      strokeWidth={2}
                    />
                  </Button>
                </form>
              </li>
            ) : (
              <li key={topic.id}>
                <div className="flex items-center gap-1.5">
                  <Button
                    aria-expanded={expanded.has(topic.id)}
                    aria-label={`${expanded.has(topic.id) ? "Hide" : "Show"} sublectures for ${topic.title}`}
                    isIconOnly
                    onPress={() =>
                      setExpanded((previous) => {
                        const next = new Set(previous);
                        if (next.has(topic.id)) next.delete(topic.id);
                        else next.add(topic.id);
                        return next;
                      })
                    }
                    size="sm"
                    variant="ghost"
                  >
                    <ChevronRight
                      aria-hidden="true"
                      className={cn(
                        "size-3.5 transition-transform duration-[var(--duration-glass)] ease-[var(--ease-glass)]",
                        expanded.has(topic.id) && "rotate-90",
                      )}
                      strokeWidth={2.1}
                    />
                  </Button>
                  <Checkbox
                    className="min-w-0 flex-1"
                    // Only the row being written to is disabled — disabling the
                    // whole list made every checkbox unresponsive during any tick.
                    isDisabled={toggle.isPending}
                    isSelected={topic.is_complete}
                    onChange={(selected) =>
                      void toggle.mutate(topic.id, selected)
                    }
                  >
                    <Checkbox.Content className="items-center gap-2.5">
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Label
                        className={
                          topic.is_complete
                            ? "text-sm text-muted line-through"
                            : "text-sm"
                        }
                      >
                        {topic.title}
                      </Label>
                    </Checkbox.Content>
                  </Checkbox>
                  <Button
                    aria-label={`Rename ${topic.title}`}
                    isIconOnly
                    onPress={() => {
                      setEditingId(topic.id);
                      setEditingTitle(topic.title);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    <Pencil
                      aria-hidden="true"
                      className="size-3.5"
                      strokeWidth={1.85}
                    />
                  </Button>
                  <Button
                    aria-label={`Remove ${topic.title}`}
                    isDisabled={remove.isPending}
                    isIconOnly
                    onPress={() => void remove.mutate(topic.id)}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2
                      aria-hidden="true"
                      className="size-3.5"
                      strokeWidth={1.85}
                    />
                  </Button>
                </div>

                {/* Loaded only once opened, so a course with many topics
                    does not fetch every sublecture list up front. */}
                {expanded.has(topic.id) ? (
                  <TopicSublectures onChanged={onChanged} topicId={topic.id} />
                ) : null}
              </li>
            ),
          )}
          {(query.data ?? []).length === 0 ? (
            <li className="py-1 text-xs text-muted">
              No topics yet — add one and this course&apos;s progress starts
              tracking.
            </li>
          ) : null}
        </ul>
      )}

      <form
        className="flex items-end gap-2"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) void add.mutate();
        }}
      >
        <TextField
          aria-label="New topic"
          className="flex-1"
          onChange={setDraft}
          validationBehavior="aria"
          value={draft}
        >
          <Input placeholder="Add a topic…" />
        </TextField>
        <Button
          isDisabled={add.isPending || !draft.trim()}
          size="sm"
          type="submit"
          variant="secondary"
        >
          <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
          Add
        </Button>
      </form>
    </section>
  );
}

/**
 * The lecture list.
 *
 * These rows existed in the database and the API from the start but had no user
 * interface at all — the disclosure above was labelled "Topics and lectures"
 * while only ever showing topics.
 */
function LectureList({
  courseId,
  query,
}: {
  courseId: string;
  query: QueryOf<Lecture>;
}) {
  const [draft, setDraft] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [editingTitle, setEditingTitle] = useState("");

  const add = useMutation(
    async () =>
      createLecture({
        course_id: courseId,
        title: draft.trim(),
        lecture_date: draftDate || null,
        position: query.data?.length ?? 0,
        notes: null,
      }),
    {
      successMessage: "Lecture added.",
      errorMessage: "Couldn't add the lecture",
      onSuccess: async () => {
        setDraft("");
        setDraftDate("");
        await query.refetch();
      },
    },
  );

  const rename = useMutation(
    async (id: string, title: string) => updateLecture(id, { title }),
    {
      successMessage: "Lecture renamed.",
      errorMessage: "Couldn't rename the lecture",
      onSuccess: async () => {
        setEditingId(undefined);
        await query.refetch();
      },
    },
  );

  const remove = useMutation(async (id: string) => deleteLecture(id), {
    successMessage: "Lecture removed.",
    errorMessage: "Couldn't remove the lecture",
    onSuccess: () => void query.refetch(),
  });

  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold tracking-wide text-muted uppercase">
        Lectures
      </h4>

      {query.isLoading ? (
        <ListSkeleton rows={2} />
      ) : query.error ? (
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          title="Couldn't load lectures"
        />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {(query.data ?? []).map((lecture) =>
            editingId === lecture.id ? (
              <li key={lecture.id}>
                <form
                  className="flex items-center gap-2"
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (editingTitle.trim())
                      void rename.mutate(lecture.id, editingTitle.trim());
                  }}
                >
                  <TextField
                    aria-label={`Rename ${lecture.title}`}
                    className="flex-1"
                    onChange={setEditingTitle}
                    validationBehavior="aria"
                    value={editingTitle}
                  >
                    <Input autoFocus />
                  </TextField>
                  <Button
                    aria-label="Save name"
                    isDisabled={rename.isPending || !editingTitle.trim()}
                    isIconOnly
                    size="sm"
                    type="submit"
                    variant="secondary"
                  >
                    <Check
                      aria-hidden="true"
                      className="size-3.5"
                      strokeWidth={2}
                    />
                  </Button>
                  <Button
                    aria-label="Cancel rename"
                    isIconOnly
                    onPress={() => setEditingId(undefined)}
                    size="sm"
                    variant="ghost"
                  >
                    <X
                      aria-hidden="true"
                      className="size-3.5"
                      strokeWidth={2}
                    />
                  </Button>
                </form>
              </li>
            ) : (
              <li key={lecture.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 text-sm">
                  {lecture.title}
                  {lecture.lecture_date ? (
                    <span className="ml-2 text-xs text-muted">
                      {formatDayMonth(lecture.lecture_date)}
                    </span>
                  ) : null}
                </span>
                <Button
                  aria-label={`Rename ${lecture.title}`}
                  isIconOnly
                  onPress={() => {
                    setEditingId(lecture.id);
                    setEditingTitle(lecture.title);
                  }}
                  size="sm"
                  variant="ghost"
                >
                  <Pencil
                    aria-hidden="true"
                    className="size-3.5"
                    strokeWidth={1.85}
                  />
                </Button>
                <Button
                  aria-label={`Remove ${lecture.title}`}
                  isDisabled={remove.isPending}
                  isIconOnly
                  onPress={() => void remove.mutate(lecture.id)}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2
                    aria-hidden="true"
                    className="size-3.5"
                    strokeWidth={1.85}
                  />
                </Button>
              </li>
            ),
          )}
          {(query.data ?? []).length === 0 ? (
            <li className="py-1 text-xs text-muted">
              No lectures recorded for this course yet.
            </li>
          ) : null}
        </ul>
      )}

      <form
        className="flex flex-wrap items-end gap-2"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) void add.mutate();
        }}
      >
        <TextField
          aria-label="New lecture"
          className="min-w-40 flex-1"
          onChange={setDraft}
          validationBehavior="aria"
          value={draft}
        >
          <Input placeholder="Add a lecture…" />
        </TextField>
        <TextField
          aria-label="Lecture date"
          onChange={setDraftDate}
          validationBehavior="aria"
          value={draftDate}
        >
          <Input type="date" />
        </TextField>
        <Button
          isDisabled={add.isPending || !draft.trim()}
          size="sm"
          type="submit"
          variant="secondary"
        >
          <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
          Add
        </Button>
      </form>
    </section>
  );
}
