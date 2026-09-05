"use client";

import { Button, Checkbox, Disclosure, Input, Label, TextField } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ErrorState, ListSkeleton } from "@/components/ui/data-states";
import { useMutation } from "@/features/shared/use-mutation";
import { useQuery } from "@/features/shared/use-query";
import { createTopic, deleteTopic, listTopics, setTopicComplete } from "./api";

/**
 * The topic checklist that drives a course's progress.
 *
 * Loaded lazily when the disclosure opens: a courses page with ten cards should
 * not fire ten topic queries nobody asked for.
 */
export function CourseTopics({ courseId, onChanged }: { courseId: string; onChanged: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const topics = useQuery(async () => listTopics(courseId), [courseId], { enabled: isOpen });

  const refresh = async () => {
    await topics.refetch();
    onChanged();
  };

  const toggle = useMutation(
    async (id: string, complete: boolean) => setTopicComplete(id, complete),
    { errorMessage: "Couldn't update the topic", onSuccess: refresh },
  );

  const add = useMutation(
    async () =>
      createTopic({
        course_id: courseId,
        title: draft.trim(),
        position: topics.data?.length ?? 0,
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

  const remove = useMutation(async (id: string) => deleteTopic(id), {
    successMessage: "Topic removed.",
    errorMessage: "Couldn't remove the topic",
    onSuccess: refresh,
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
        <Disclosure.Body className="flex flex-col gap-3 pt-1">
          {topics.isLoading ? (
            <ListSkeleton rows={3} />
          ) : topics.error ? (
            <ErrorState error={topics.error} onRetry={() => void topics.refetch()} title="Couldn't load topics" />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {(topics.data ?? []).map((topic) => (
                <li key={topic.id} className="flex items-center gap-2">
                  <Checkbox
                    className="min-w-0 flex-1"
                    isDisabled={toggle.isPending}
                    isSelected={topic.is_complete}
                    onChange={(selected) => void toggle.mutate(topic.id, selected)}
                  >
                    <Checkbox.Content className="items-center gap-2.5">
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Label className={topic.is_complete ? "text-sm text-muted line-through" : "text-sm"}>
                        {topic.title}
                      </Label>
                    </Checkbox.Content>
                  </Checkbox>
                  <Button
                    aria-label={`Remove ${topic.title}`}
                    isDisabled={remove.isPending}
                    isIconOnly
                    onPress={() => void remove.mutate(topic.id)}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" strokeWidth={1.85} />
                  </Button>
                </li>
              ))}
              {(topics.data ?? []).length === 0 ? (
                <li className="py-1 text-xs text-muted">
                  No topics yet — add one and this course&apos;s progress starts tracking.
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
              value={draft}
              validationBehavior="aria"
            >
              <Input placeholder="Add a topic…" />
            </TextField>
            <Button isDisabled={add.isPending || !draft.trim()} size="sm" type="submit" variant="secondary">
              <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
              Add
            </Button>
          </form>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}
