"use client";

import { Button, Card, Chip } from "@heroui/react";
import { Layers, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { GlassStat } from "@/components/glass/glass-card";
import { CourseDot } from "@/components/ui/course-dot";
import { ErrorState, ListSkeleton, LoadingRegion, NoData } from "@/components/ui/data-states";
import { ConfirmDeleteDialog } from "@/components/ui/form-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { listAllTopics, listCourses } from "@/features/courses/api";
import { deleteFlashcard, listDueFlashcards, listFlashcards } from "@/features/flashcards/api";
import { FlashcardFormDialog } from "@/features/flashcards/flashcard-form";
import { StudyDeck } from "@/features/flashcards/study-deck";
import { useMutation } from "@/features/shared/use-mutation";
import { useQuery } from "@/features/shared/use-query";
import type { Flashcard } from "@/lib/supabase/database.types";
import { relativeDayLabel } from "@/lib/date";

export default function FlashcardsPage() {
  const load = useCallback(async () => {
    const [cards, courses, topics] = await Promise.all([
      listFlashcards(),
      listCourses(),
      listAllTopics(),
    ]);
    /*
     * The clock is read here, in the loader, rather than during render: a
     * render must be pure, and a due count that re-derives itself on every
     * paint would flicker as the second ticks over. One reading per load is
     * both correct and stable.
     */
    return { cards, courses, topics, loadedAt: Date.now() };
  }, []);

  const { data, error, isLoading, refetch } = useQuery(load, []);

  const [editing, setEditing] = useState<Flashcard | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Flashcard | undefined>(undefined);
  const [session, setSession] = useState<Flashcard[] | undefined>(undefined);

  const remove = useMutation(async (id: string) => deleteFlashcard(id), {
    successMessage: "Card deleted.",
    errorMessage: "Couldn't delete the card",
    onSuccess: () => {
      setPendingDelete(undefined);
      void refetch();
    },
  });

  // The deck is fetched when the session starts, so it reflects what is due
  // now rather than what was due when the page was opened.
  const start = useMutation(async () => listDueFlashcards(null), {
    errorMessage: "Couldn't start the session",
    onSuccess: (due) => setSession(due),
  });

  const cards = data?.cards ?? [];
  const courses = data?.courses ?? [];
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const now = data?.loadedAt ?? 0;
  const dueCount = cards.filter((card) => Date.parse(card.due_at) <= now).length;

  if (session) {
    return (
      <StudyDeck
        cards={session}
        courses={courses}
        onDone={() => {
          setSession(undefined);
          void refetch();
        }}
      />
    );
  }

  const openForm = (card?: Flashcard) => {
    setEditing(card);
    setIsFormOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader
        actions={
          <Button onPress={() => openForm()} size="sm" variant="primary">
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
            Add card
          </Button>
        }
        description={
          cards.length === 0
            ? "Question on the front, answer on the back."
            : `${cards.length} ${cards.length === 1 ? "card" : "cards"} · ${dueCount} due`
        }
        title="Flashcards"
      />

      {cards.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <GlassStat
            caption={dueCount === 0 ? "Nothing waiting" : "Ready to review"}
            label="Due now"
            value={dueCount}
          />
          <GlassStat label="In the deck" value={cards.length} />
        </div>
      ) : null}

      {dueCount > 0 ? (
        <Button
          className="self-start"
          isDisabled={start.isPending}
          onPress={() => void start.mutate()}
          size="lg"
          variant="primary"
        >
          <Play aria-hidden="true" className="size-4" strokeWidth={2.2} />
          {start.isPending ? "Loading…" : `Study ${dueCount} ${dueCount === 1 ? "card" : "cards"}`}
        </Button>
      ) : null}

      {isLoading ? (
        <>
          <LoadingRegion label="Loading flashcards" />
          <ListSkeleton rows={4} />
        </>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load your flashcards" />
      ) : cards.length === 0 ? (
        <Card className="border border-border p-8">
          <NoData
            action={
              <Button onPress={() => openForm()} size="sm" variant="primary">
                <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
                Add your first card
              </Button>
            }
            description="Write a question and its answer, and the app schedules when you see it again."
            icon={<Layers aria-hidden="true" className="size-5" strokeWidth={1.75} />}
            title="No flashcards yet"
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const course = card.course_id ? courseById.get(card.course_id) : undefined;
            const isDue = Date.parse(card.due_at) <= now;

            return (
              <li key={card.id}>
                <Card className="h-full border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm font-medium text-foreground">{card.front}</p>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        aria-label={`Edit ${card.front}`}
                        isIconOnly
                        onPress={() => openForm(card)}
                        size="sm"
                        variant="ghost"
                      >
                        <Pencil aria-hidden="true" className="size-4" strokeWidth={1.85} />
                      </Button>
                      <Button
                        aria-label={`Delete ${card.front}`}
                        isIconOnly
                        onPress={() => setPendingDelete(card)}
                        size="sm"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.85} />
                      </Button>
                    </div>
                  </div>

                  <p className="mt-1.5 line-clamp-2 text-sm text-muted">{card.back}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted">
                    {course ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CourseDot course={course} />
                        {course.code}
                      </span>
                    ) : null}
                    <Chip color={isDue ? "accent" : "default"} size="sm" variant="soft">
                      {isDue ? "Due now" : `Due ${relativeDayLabel(card.due_at.slice(0, 10))}`}
                    </Chip>
                    {card.review_count > 0 ? (
                      <span className="tabular">
                        {card.review_count} {card.review_count === 1 ? "review" : "reviews"}
                      </span>
                    ) : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {isFormOpen ? (
        <FlashcardFormDialog
          card={editing}
          courses={courses}
          isOpen={isFormOpen}
          key={editing?.id ?? "new"}
          onOpenChange={setIsFormOpen}
          onSaved={refetch}
          topics={data?.topics ?? []}
        />
      ) : null}

      <ConfirmDeleteDialog
        description={pendingDelete ? `"${pendingDelete.front}" will be permanently deleted.` : ""}
        isOpen={Boolean(pendingDelete)}
        isPending={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) void remove.mutate(pendingDelete.id);
        }}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(undefined);
        }}
        title="Delete this card?"
      />
    </div>
  );
}
