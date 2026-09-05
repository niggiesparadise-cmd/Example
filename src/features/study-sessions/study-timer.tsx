"use client";

import { Button, Dropdown, Spinner } from "@heroui/react";
import { Square, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation } from "@/features/shared/use-mutation";
import { useQuery } from "@/features/shared/use-query";
import type { Course } from "@/lib/supabase/database.types";
import { formatDuration } from "@/lib/format";
import { getRunningSession, startSession, stopSession } from "./api";

/**
 * Start/stop control for a study session.
 *
 * The running session lives in the database, not in component state, so the
 * timer survives a reload, a navigation, or the app being backgrounded on the
 * phone — closing the app mid-session does not lose it.
 */
export function StudyTimer({ courses, onChanged }: { courses: Course[]; onChanged: () => void }) {
  const running = useQuery(getRunningSession, []);
  const [now, setNow] = useState(() => Date.now());

  const session = running.data ?? null;

  // Only the interval callback sets state; the displayed value is derived below.
  // The authoritative duration is the generated column Postgres computes on stop.
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(interval);
  }, [session]);

  const elapsed = session
    ? Math.max(0, Math.round((now - new Date(session.started_at).getTime()) / 60_000))
    : 0;

  const start = useMutation(async (courseId: string | null) => startSession(courseId), {
    successMessage: "Study session started.",
    errorMessage: "Couldn't start the session",
    onSuccess: async () => {
      await running.refetch();
      onChanged();
    },
  });

  const stop = useMutation(async (id: string) => stopSession(id), {
    successMessage: (result) => `Logged ${formatDuration(result.duration_minutes ?? 0)}.`,
    errorMessage: "Couldn't stop the session",
    onSuccess: async () => {
      await running.refetch();
      onChanged();
    },
  });

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
      <Button
        isDisabled={stop.isPending}
        onPress={() => void stop.mutate(session.id)}
        size="sm"
        variant="danger-soft"
      >
        <Square aria-hidden="true" className="size-4" strokeWidth={2.25} />
        {stop.isPending ? "Stopping…" : `Stop · ${formatDuration(elapsed)}`}
      </Button>
    );
  }

  // With no courses there is nothing to attribute the time to, so start unlinked.
  if (courses.length === 0) {
    return (
      <Button isDisabled={start.isPending} onPress={() => void start.mutate(null)} size="sm" variant="secondary">
        <Timer aria-hidden="true" className="size-4" strokeWidth={2} />
        {start.isPending ? "Starting…" : "Start focus session"}
      </Button>
    );
  }

  return (
    <Dropdown>
      <Button isDisabled={start.isPending} size="sm" variant="secondary">
        <Timer aria-hidden="true" className="size-4" strokeWidth={2} />
        {start.isPending ? "Starting…" : "Start focus session"}
      </Button>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu onAction={(key) => void start.mutate(key === "none" ? null : String(key))}>
          {courses.map((course) => (
            <Dropdown.Item key={course.id} id={course.id} textValue={course.code}>
              {course.code} — {course.title}
            </Dropdown.Item>
          ))}
          <Dropdown.Item id="none" textValue="No course">
            No course
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
