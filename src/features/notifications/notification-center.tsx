"use client";

import { Badge, Button, Popover, Separator, Spinner, cn } from "@heroui/react";
import {
  Bell,
  CalendarClock,
  CheckCheck,
  ClipboardList,
  Layers,
  ListChecks,
  Swords,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { useMutation } from "@/features/shared/use-mutation";
import { useDataVersion } from "@/features/shared/data-version";
import { useQuery } from "@/features/shared/use-query";
import type { AppNotification, NotificationKind } from "@/lib/supabase/database.types";
import { relativeDayLabel } from "@/lib/date";
import {
  clearAll,
  dismiss,
  hrefOf,
  listNotifications,
  markAllRead,
  markRead,
  syncDerivedNotifications,
} from "./api";

/**
 * The notification centre behind the bell.
 *
 * The button used to be inert with a hardcoded badge of "3". It now opens a
 * real list backed by the `notifications` table: challenge invitations and
 * results arrive from database triggers, and the time-based reminders are
 * materialised on load.
 */

const ICONS: Record<NotificationKind, typeof Bell> = {
  "task-due": ListChecks,
  "exam-soon": CalendarClock,
  "study-reminder": ClipboardList,
  "flashcards-due": Layers,
  "challenge-invitation": Swords,
  "challenge-result": Trophy,
};

export function NotificationCenter() {
  const dataVersion = useDataVersion();

  const load = useCallback(async () => listNotifications(), []);
  const { data, isLoading, refetch, setData } = useQuery(load, [dataVersion]);

  /*
   * Materialise the time-based reminders once per mount.
   *
   * The ref keeps React's development double-render from running it twice; the
   * `dedupe_key` unique index would refuse the duplicates anyway, but there is
   * no reason to make the round trip.
   */
  const syncedRef = useRef(false);
  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;

    void syncDerivedNotifications()
      .then((created) => {
        if (created > 0) void refetch();
      })
      // A reminder that could not be derived is not worth an error toast — the
      // list still shows everything that did arrive.
      .catch(() => {});
  }, [refetch]);

  const items = data ?? [];
  const unread = items.filter((item) => item.read_at === null).length;

  // Optimistic: the row is already gone from view before the write lands, and
  // a failure refetches, putting it back.
  const readOne = useMutation(async (id: string) => markRead(id), {
    errorMessage: "Couldn't mark that as read",
    onSuccess: () => void refetch(),
  });

  const readAll = useMutation(async () => markAllRead(), {
    successMessage: "All caught up.",
    errorMessage: "Couldn't mark everything as read",
    onSuccess: () => void refetch(),
  });

  const remove = useMutation(async (id: string) => dismiss(id), {
    errorMessage: "Couldn't dismiss that",
    onSuccess: () => void refetch(),
  });

  const clear = useMutation(async () => clearAll(), {
    successMessage: "Notifications cleared.",
    errorMessage: "Couldn't clear your notifications",
    onSuccess: () => void refetch(),
  });

  const onOpen = (notification: AppNotification) => {
    if (notification.read_at === null) {
      setData((previous) =>
        (previous ?? []).map((item) =>
          item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item,
        ),
      );
      void readOne.mutate(notification.id);
    }
  };

  return (
    <Popover>
      <Badge.Anchor>
        <Button
          aria-label={
            unread === 0 ? "Notifications" : `Notifications, ${unread} unread`
          }
          isIconOnly
          size="sm"
          variant="ghost"
        >
          <Bell aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />
        </Button>
        {unread > 0 ? (
          <Badge aria-hidden="true" color="danger" placement="top-right" size="sm">
            {unread > 9 ? "9+" : unread}
          </Badge>
        ) : null}
      </Badge.Anchor>

      <Popover.Content
        className="glass glass-lit w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden p-0"
        placement="bottom end"
      >
        <Popover.Dialog aria-label="Notifications" className="p-0">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
            {unread > 0 ? (
              <Button
                isDisabled={readAll.isPending}
                onPress={() => void readAll.mutate()}
                size="sm"
                variant="ghost"
              >
                <CheckCheck aria-hidden="true" className="size-3.5" strokeWidth={2} />
                Mark all read
              </Button>
            ) : null}
          </div>

          <Separator />

          <div className="max-h-[min(26rem,60dvh)] overflow-y-auto overscroll-contain">
            {isLoading ? (
              <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted">
                <Spinner size="sm" />
                Loading…
              </p>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell
                  aria-hidden="true"
                  className="mx-auto size-5 text-muted"
                  strokeWidth={1.6}
                />
                <p className="mt-2 text-sm font-medium text-foreground">Nothing right now</p>
                <p className="mt-1 text-xs text-muted">
                  Due tasks, approaching exams and challenge activity show up here.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {items.map((item) => (
                  <NotificationRow
                    isDismissing={remove.isPending}
                    key={item.id}
                    notification={item}
                    onDismiss={() => void remove.mutate(item.id)}
                    onOpen={() => onOpen(item)}
                  />
                ))}
              </ul>
            )}
          </div>

          {items.length > 0 ? (
            <>
              <Separator />
              <div className="px-4 py-2.5">
                <Button
                  isDisabled={clear.isPending}
                  onPress={() => void clear.mutate()}
                  size="sm"
                  variant="ghost"
                >
                  {clear.isPending ? "Clearing…" : "Clear all"}
                </Button>
              </div>
            </>
          ) : null}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

function NotificationRow({
  isDismissing,
  notification,
  onDismiss,
  onOpen,
}: {
  isDismissing: boolean;
  notification: AppNotification;
  onDismiss: () => void;
  onOpen: () => void;
}) {
  const Icon = ICONS[notification.kind] ?? Bell;
  const href = hrefOf(notification);
  const isUnread = notification.read_at === null;

  const body = (
    <>
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
          isUnread ? "bg-accent-soft text-accent" : "bg-surface-secondary text-muted",
        )}
      >
        <Icon aria-hidden="true" className="size-4" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              isUnread ? "font-semibold text-foreground" : "font-medium text-muted",
            )}
          >
            {notification.title}
          </span>
          {isUnread ? (
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
          ) : null}
        </span>
        {notification.body ? (
          <span className="mt-0.5 block truncate text-xs text-muted">{notification.body}</span>
        ) : null}
        <span className="mt-0.5 block text-[11px] text-muted">
          {relativeDayLabel(notification.created_at.slice(0, 10))}
        </span>
      </span>
    </>
  );

  return (
    <li className="flex items-start gap-1 border-b border-border/60 px-2 py-2 last:border-b-0">
      {href ? (
        <Link
          className="flex min-w-0 flex-1 items-start gap-3 rounded-[var(--radius-glass-sm)] px-2 py-1.5 outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus"
          href={href}
          onClick={onOpen}
        >
          {body}
        </Link>
      ) : (
        <button
          className="flex min-w-0 flex-1 items-start gap-3 rounded-[var(--radius-glass-sm)] px-2 py-1.5 text-left outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus"
          onClick={onOpen}
          type="button"
        >
          {body}
        </button>
      )}

      <Button
        aria-label={`Dismiss ${notification.title}`}
        isDisabled={isDismissing}
        isIconOnly
        onPress={onDismiss}
        size="sm"
        variant="ghost"
      >
        <X aria-hidden="true" className="size-3.5" strokeWidth={2} />
      </Button>
    </li>
  );
}
