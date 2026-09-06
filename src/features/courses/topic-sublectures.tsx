"use client";

import { Button, Checkbox, Input, Label, TextField, cn } from "@heroui/react";
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { ErrorState } from "@/components/ui/data-states";
import { useMutation } from "@/features/shared/use-mutation";
import { useQuery } from "@/features/shared/use-query";
import type { Sublecture } from "@/lib/supabase/database.types";
import { formatDayMonth } from "@/lib/date";
import {
  createSublecture,
  deleteSublecture,
  listSublectures,
  setSublectureComplete,
  swapSublecturePositions,
  updateSublecture,
} from "./api";

/**
 * The sublectures under one topic.
 *
 * Loaded when the topic is expanded rather than with the topic list: a course
 * with a dozen topics should not fetch a dozen sublecture queries nobody has
 * asked to see.
 *
 * The progress bar is `completed / total` counted from the rows below it. There
 * is no percentage stored anywhere — a second copy of a number that is already
 * derivable is a number that eventually disagrees with itself.
 */
export function TopicSublectures({
  onChanged,
  topicId,
}: {
  onChanged: () => void;
  topicId: string;
}) {
  const query = useQuery(async () => listSublectures(topicId), [topicId]);

  const [draft, setDraft] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [editingTitle, setEditingTitle] = useState("");
  const [togglingId, setTogglingId] = useState<string | undefined>(undefined);

  const items = query.data ?? [];

  const refresh = async () => {
    await query.refetch();
    onChanged();
  };

  const toggle = useMutation(
    async (id: string, complete: boolean) => {
      setTogglingId(id);
      try {
        return await setSublectureComplete(id, complete);
      } finally {
        setTogglingId(undefined);
      }
    },
    { errorMessage: "Couldn't update that sublecture", onSuccess: refresh },
  );

  const add = useMutation(
    async () =>
      createSublecture({
        topic_id: topicId,
        title: draft.trim(),
        description: null,
        scheduled_date: draftDate || null,
        completed_at: null,
        // New items go on the end; positions stay dense because nothing else
        // reorders them behind our back.
        position: items.length,
      }),
    {
      successMessage: "Sublecture added.",
      errorMessage: "Couldn't add the sublecture",
      onSuccess: async () => {
        setDraft("");
        setDraftDate("");
        await refresh();
      },
    },
  );

  const rename = useMutation(async (id: string, title: string) => updateSublecture(id, { title }), {
    successMessage: "Sublecture renamed.",
    errorMessage: "Couldn't rename the sublecture",
    onSuccess: async () => {
      setEditingId(undefined);
      await refresh();
    },
  });

  const move = useMutation(
    async (index: number, direction: -1 | 1) => {
      const a = items[index];
      const b = items[index + direction];
      if (!a || !b) return;
      await swapSublecturePositions(
        { id: a.id, position: a.position },
        { id: b.id, position: b.position },
      );
    },
    { errorMessage: "Couldn't reorder", onSuccess: refresh },
  );

  const remove = useMutation(async (id: string) => deleteSublecture(id), {
    successMessage: "Sublecture removed.",
    errorMessage: "Couldn't remove the sublecture",
    onSuccess: refresh,
  });

  const done = items.filter((item) => item.completed_at !== null).length;
  const percent = items.length === 0 ? 0 : Math.round((done / items.length) * 100);

  return (
    <div className="mt-2 ml-4 flex flex-col gap-2 border-l border-border pl-2.5 sm:ml-7 sm:pl-3">
      {items.length > 0 ? (
        <div className="flex items-center gap-2">
          <div
            aria-label="Topic progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={percent}
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-secondary"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-[var(--duration-glass)] ease-[var(--ease-glass)]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="tabular shrink-0 text-[11px] text-muted">
            {done}/{items.length} · {percent}%
          </span>
        </div>
      ) : null}

      {query.isLoading ? (
        <p className="py-1 text-xs text-muted">Loading sublectures…</p>
      ) : query.error ? (
        <ErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
          title="Couldn't load sublectures"
        />
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item, index) =>
            editingId === item.id ? (
              <li key={item.id}>
                <form
                  className="flex items-center gap-1.5"
                  noValidate
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (editingTitle.trim()) void rename.mutate(item.id, editingTitle.trim());
                  }}
                >
                  <TextField
                    aria-label={`Rename ${item.title}`}
                    className="flex-1"
                    onChange={setEditingTitle}
                    validationBehavior="aria"
                    value={editingTitle}
                  >
                    <Input autoFocus />
                  </TextField>
                  <Button
                    aria-label="Save sublecture name"
                    isDisabled={rename.isPending || !editingTitle.trim()}
                    isIconOnly
                    size="sm"
                    type="submit"
                    variant="secondary"
                  >
                    <Check aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
                  </Button>
                  <Button
                    aria-label="Cancel sublecture rename"
                    isIconOnly
                    onPress={() => setEditingId(undefined)}
                    size="sm"
                    variant="ghost"
                  >
                    <X aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
                  </Button>
                </form>
              </li>
            ) : (
              <SublectureRow
                canMoveDown={index < items.length - 1}
                canMoveUp={index > 0}
                isToggling={togglingId === item.id}
                item={item}
                key={item.id}
                onDelete={() => void remove.mutate(item.id)}
                onMove={(direction) => void move.mutate(index, direction)}
                onRename={() => {
                  setEditingId(item.id);
                  setEditingTitle(item.title);
                }}
                onToggle={(complete) => void toggle.mutate(item.id, complete)}
              />
            ),
          )}

          {items.length === 0 ? (
            <li className="py-1 text-xs text-muted">
              No sublectures yet — add one and this topic starts tracking progress.
            </li>
          ) : null}
        </ul>
      )}

      <form
        className="flex flex-wrap items-end gap-1.5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) void add.mutate();
        }}
      >
        <TextField
          aria-label="New sublecture"
          className="min-w-36 flex-1"
          onChange={setDraft}
          validationBehavior="aria"
          value={draft}
        >
          <Input placeholder="Add a sublecture…" />
        </TextField>
        <TextField
          aria-label="Sublecture date"
          onChange={setDraftDate}
          validationBehavior="aria"
          value={draftDate}
        >
          <Input type="date" />
        </TextField>
        <Button isDisabled={add.isPending || !draft.trim()} size="sm" type="submit" variant="tertiary">
          <Plus aria-hidden="true" className="size-3.5" strokeWidth={2.3} />
          Add
        </Button>
      </form>
    </div>
  );
}

function SublectureRow({
  canMoveDown,
  canMoveUp,
  isToggling,
  item,
  onDelete,
  onMove,
  onRename,
  onToggle,
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  isToggling: boolean;
  item: Sublecture;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onRename: () => void;
  onToggle: (complete: boolean) => void;
}) {
  const isDone = item.completed_at !== null;

  return (
    /*
     * Title and date stack; the four controls sit in a fixed-width column
     * beside them. Laying them all out in one row left the title about eighty
     * pixels wide on a 360px screen, which wrapped every second word.
     */
    <li className="flex items-start justify-between gap-1">
      <Checkbox
        className="min-w-0 flex-1 py-1"
        // Only the row being written to is disabled; disabling the whole list
        // would freeze every checkbox during any single tick.
        isDisabled={isToggling}
        isSelected={isDone}
        onChange={onToggle}
      >
        <Checkbox.Content className="items-start gap-2">
          <Checkbox.Control className="mt-0.5">
            <Checkbox.Indicator />
          </Checkbox.Control>
          <span className="min-w-0 flex-1">
            <Label className={cn("block text-sm leading-snug", isDone && "text-muted line-through")}>
              {item.title}
            </Label>
            {item.scheduled_date ? (
              <span className="mt-0.5 block text-[11px] text-muted">
                {formatDayMonth(item.scheduled_date)}
              </span>
            ) : null}
          </span>
        </Checkbox.Content>
      </Checkbox>

      <span className="flex shrink-0 items-center">
        <Button
          aria-label={`Move ${item.title} up`}
          className="size-7 min-w-7"
          isDisabled={!canMoveUp}
          isIconOnly
          onPress={() => onMove(-1)}
          size="sm"
          variant="ghost"
        >
          <ChevronUp aria-hidden="true" className="size-3.5" strokeWidth={2} />
        </Button>
        <Button
          aria-label={`Move ${item.title} down`}
          className="size-7 min-w-7"
          isDisabled={!canMoveDown}
          isIconOnly
          onPress={() => onMove(1)}
          size="sm"
          variant="ghost"
        >
          <ChevronDown aria-hidden="true" className="size-3.5" strokeWidth={2} />
        </Button>
        <Button
          aria-label={`Rename ${item.title}`}
          className="size-7 min-w-7"
          isIconOnly
          onPress={onRename}
          size="sm"
          variant="ghost"
        >
          <Pencil aria-hidden="true" className="size-3.5" strokeWidth={1.85} />
        </Button>
        <Button
          aria-label={`Remove ${item.title}`}
          className="size-7 min-w-7"
          isIconOnly
          onPress={onDelete}
          size="sm"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" className="size-3.5" strokeWidth={1.85} />
        </Button>
      </span>
    </li>
  );
}
