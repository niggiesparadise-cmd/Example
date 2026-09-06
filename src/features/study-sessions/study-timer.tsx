"use client";

import {
  Button,
  Dropdown,
  Label,
  ListBox,
  Select,
  Spinner,
} from "@heroui/react";
import { Square, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { FormDialog } from "@/components/ui/form-dialog";
import { useMutation } from "@/features/shared/use-mutation";
import { useQuery } from "@/features/shared/use-query";
import type { Course, StudySession } from "@/lib/supabase/database.types";
import { formatDuration } from "@/lib/format";
import {
  getRunningSession,
  setSessionFocus,
  startSession,
  stopSession,
} from "./api";

/**
 * Focus is stored 0-100, but asking someone to pick a number out of a hundred
 * after a study session is a worse question than asking how it went.
 */
const FOCUS_LEVELS = [
  { id: "90", label: "Deep focus" },
  { id: "70", label: "Focused" },
  { id: "50", label: "Mixed" },
  { id: "30", label: "Distracted" },
  { id: "10", label: "Barely got going" },
] as const;

/**
 * Start/stop control for a study session.
 *
 * The running session lives in the database, not in component state, so the
 * timer survives a reload, a navigation, or the app being backgrounded on the
 * phone — closing the app mid-session does not lose it.
 */
export function StudyTimer({
  courses,
  onChanged,
}: {
  courses: Course[];
  onChanged: () => void;
}) {
  const running = useQuery(getRunningSession, []);
  const [now, setNow] = useState(() => Date.now());
  // The session that just stopped and is waiting for an optional focus rating.
  const [rating, setRating] = useState<StudySession | undefined>(undefined);
  const [focusLevel, setFocusLevel] = useState<string>("70");

  const session = running.data ?? null;

  // Only the interval callback sets state; the displayed value is derived below.
  // The authoritative duration is the generated column Postgres computes on stop.
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(interval);
  }, [session]);

  const elapsed = session
    ? Math.max(
        0,
        Math.round((now - new Date(session.started_at).getTime()) / 60_000),
      )
    : 0;

  const start = useMutation(
    async (courseId: string | null) => startSession(courseId),
    {
      successMessage: "Study session started.",
      errorMessage: "Couldn't start the session",
      onSuccess: async () => {
        await running.refetch();
        onChanged();
      },
    },
  );

  const stop = useMutation(async (id: string) => stopSession(id), {
    successMessage: (result) =>
      `Logged ${formatDuration(result.duration_minutes ?? 0)}.`,
    errorMessage: "Couldn't stop the session",
    onSuccess: async (result) => {
      // The stop has already landed; the rating is a separate, optional write.
      setRating(result);
      setFocusLevel("70");
      await running.refetch();
      onChanged();
    },
  });

  const rate = useMutation(
    async (id: string, focus: number) => setSessionFocus(id, focus),
    {
      successMessage: "Focus saved.",
      errorMessage: "Couldn't save your focus score",
      onSuccess: () => {
        setRating(undefined);
        onChanged();
      },
    },
  );

  const focusDialog = rating ? (
    <FormDialog
      error={rate.error}
      isOpen
      isPending={rate.isPending}
      onOpenChange={(open) => {
        // Dismissing is a legitimate answer: the session is already recorded.
        if (!open) setRating(undefined);
      }}
      onSubmit={() => {
        if (rating) void rate.mutate(rating.id, Number(focusLevel));
      }}
      submitLabel="Save focus"
      title={`Logged ${formatDuration(rating.duration_minutes ?? 0)}`}
    >
      <Select
        onSelectionChange={(key) => setFocusLevel(String(key))}
        selectedKey={focusLevel}
      >
        <Label>How focused were you?</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {FOCUS_LEVELS.map((level) => (
              <ListBox.Item
                key={level.id}
                id={level.id}
                textValue={level.label}
              >
                {level.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      <p className="text-xs text-muted">
        Optional — this is what the focus figure on Analytics is averaged from.
        Cancel to skip it.
      </p>
    </FormDialog>
  ) : null;

  if (running.isLoading) {
    return (
      <Button isDisabled size="sm" variant="secondary">
        <Spinner size="sm" />
        Loading
      </Button>
    );
  }

  if (session) {
    return (
      <>
        <Button
          isDisabled={stop.isPending}
          onPress={() => void stop.mutate(session.id)}
          size="sm"
          variant="danger-soft"
        >
          <Square aria-hidden="true" className="size-4" strokeWidth={2.25} />
          {stop.isPending ? "Stopping…" : `Stop · ${formatDuration(elapsed)}`}
        </Button>
        {focusDialog}
      </>
    );
  }

  // With no courses there is nothing to attribute the time to, so start unlinked.
  if (courses.length === 0) {
    return (
      <>
        <Button
          isDisabled={start.isPending}
          onPress={() => void start.mutate(null)}
          size="sm"
          variant="secondary"
        >
          <Timer aria-hidden="true" className="size-4" strokeWidth={2} />
          {start.isPending ? "Starting…" : "Start focus session"}
        </Button>
        {focusDialog}
      </>
    );
  }

  return (
    <>
      <Dropdown>
        <Button isDisabled={start.isPending} size="sm" variant="secondary">
          <Timer aria-hidden="true" className="size-4" strokeWidth={2} />
          {start.isPending ? "Starting…" : "Start focus session"}
        </Button>
        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu
            onAction={(key) =>
              void start.mutate(key === "none" ? null : String(key))
            }
          >
            {courses.map((course) => (
              <Dropdown.Item
                key={course.id}
                id={course.id}
                textValue={course.code}
              >
                {course.code} — {course.title}
              </Dropdown.Item>
            ))}
            <Dropdown.Item id="none" textValue="No course">
              No course
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      {focusDialog}
    </>
  );
}
