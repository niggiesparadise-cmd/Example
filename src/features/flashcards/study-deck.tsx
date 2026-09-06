"use client";

import { Button, Chip, cn } from "@heroui/react";
import { Check, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { GlassCard, GlassStat } from "@/components/glass/glass-card";
import { GlassSurface } from "@/components/glass/glass-surface";
import { CourseDot } from "@/components/ui/course-dot";
import { useMutation } from "@/features/shared/use-mutation";
import type { Course, Flashcard, FlashcardRating } from "@/lib/supabase/database.types";
import { reviewFlashcard } from "./api";

/**
 * The study session.
 *
 * One card at a time, flipped to reveal the answer, then rated. The rating goes
 * straight to the database, which decides when the card comes back — this
 * component never schedules anything itself.
 *
 * A card rated `again` is also pushed back onto the end of *this* session's
 * queue, so "again" means what it says within the sitting as well as across
 * days.
 */

type RatingVariant = "danger-soft" | "secondary" | "primary" | "outline";

const RATINGS: { id: FlashcardRating; label: string; hint: string; variant: RatingVariant }[] = [
  { id: "again", label: "Again", hint: "No idea", variant: "danger-soft" },
  { id: "hard", label: "Hard", hint: "Struggled", variant: "secondary" },
  { id: "good", label: "Good", hint: "Got it", variant: "primary" },
  { id: "easy", label: "Easy", hint: "Instant", variant: "outline" },
];

interface Outcome {
  cardId: string;
  rating: FlashcardRating;
}

export function StudyDeck({
  cards,
  courses,
  onDone,
  onReviewed,
}: {
  cards: Flashcard[];
  courses: Course[];
  onDone: () => void;
  onReviewed?: () => void;
}) {
  // The session's own queue, so `again` can requeue without refetching.
  const [queue, setQueue] = useState<Flashcard[]>(() => cards);
  const [position, setPosition] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  /*
   * When the current card was put on screen, used to record how long it took to
   * answer. A lazy `useState` initialiser rather than `useRef(Date.now())`:
   * reading the clock in the render body is an impure call, and the compiler is
   * right to object — the value only needs to be captured once.
   */
  const [shownAt, setShownAt] = useState(() => Date.now());

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const card = queue[position];

  const rate = useMutation(
    async (id: string, rating: FlashcardRating, durationMs: number) =>
      reviewFlashcard(id, rating, durationMs),
    { errorMessage: "Couldn't record that review" },
  );

  const advance = useCallback(
    async (rating: FlashcardRating) => {
      if (!card) return;
      const elapsed = Date.now() - shownAt;

      const saved = await rate.mutate(card.id, rating, elapsed);
      // A failed write must not silently count as studied.
      if (!saved) return;

      setOutcomes((previous) => [...previous, { cardId: card.id, rating }]);
      onReviewed?.();

      // "Again" comes back before the session ends; the others are done for now.
      if (rating === "again") setQueue((previous) => [...previous, card]);

      setIsFlipped(false);
      setShownAt(Date.now());
      setPosition((previous) => previous + 1);
    },
    [card, onReviewed, rate, shownAt],
  );

  if (!card) {
    return <SessionSummary cards={cards} onDone={onDone} outcomes={outcomes} />;
  }

  const course = card.course_id ? courseById.get(card.course_id) : undefined;
  // Requeued cards make the queue longer than the deck; count the deck.
  const total = queue.length;
  const progress = Math.round((position / Math.max(1, total)) * 100);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="tabular text-muted">
          Card {position + 1} of {total}
        </span>
        {course ? (
          <span className="inline-flex items-center gap-1.5 text-muted">
            <CourseDot course={course} />
            {course.code}
          </span>
        ) : (
          <span className="text-muted">No course</span>
        )}
      </div>

      <div
        aria-label="Study progress"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={progress}
        className="h-1.5 overflow-hidden rounded-full bg-surface-secondary"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-[var(--duration-glass)] ease-[var(--ease-glass)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* The card. Tapping anywhere on it flips it. */}
      <div className="flip-scene">
        <button
          aria-label={isFlipped ? "Show the question" : "Show the answer"}
          className="flip-card block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 rounded-[var(--radius-glass-lg)]"
          data-flipped={isFlipped}
          onClick={() => setIsFlipped((previous) => !previous)}
          type="button"
        >
          <GlassSurface
            className="flip-face flip-face-front flex min-h-56 flex-col justify-center gap-3 p-6"
            radius="lg"
            tone="strong"
          >
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">Question</span>
            <p className="font-display text-xl leading-snug font-semibold text-balance text-foreground">
              {card.front}
            </p>
            <span className="mt-2 text-xs text-muted">Tap to reveal the answer</span>
          </GlassSurface>

          <GlassSurface
            className="flip-face flip-face-back flex min-h-56 flex-col justify-center gap-3 p-6"
            radius="lg"
            tone="strong"
          >
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">Answer</span>
            <p className="text-lg leading-relaxed text-balance text-foreground">{card.back}</p>
            <span className="mt-2 text-xs text-muted">How well did you know it?</span>
          </GlassSurface>
        </button>
      </div>

      {/*
        The rating buttons only appear once the answer is showing — rating a
        card you have not turned over is not a judgement, it is a guess.
      */}
      <div
        className={cn(
          "grid grid-cols-2 gap-2 transition-opacity duration-[var(--duration-glass)] sm:grid-cols-4",
          isFlipped ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {RATINGS.map((rating) => (
          <Button
            isDisabled={rate.isPending || !isFlipped}
            key={rating.id}
            onPress={() => void advance(rating.id)}
            size="lg"
            variant={rating.variant}
          >
            <span className="flex flex-col items-center leading-tight">
              <span className="font-semibold">{rating.label}</span>
              <span className="text-[11px] opacity-80">{rating.hint}</span>
            </span>
          </Button>
        ))}
      </div>

      <Button className="self-center" onPress={onDone} size="sm" variant="tertiary">
        End session
      </Button>
    </div>
  );
}

/** What the sitting added up to. */
function SessionSummary({
  cards,
  onDone,
  outcomes,
}: {
  cards: Flashcard[];
  onDone: () => void;
  outcomes: Outcome[];
}) {
  const tally = useMemo(() => {
    const counts: Record<FlashcardRating, number> = { again: 0, hard: 0, good: 0, easy: 0 };
    for (const outcome of outcomes) counts[outcome.rating] += 1;
    return counts;
  }, [outcomes]);

  // A card rated "again" was seen more than once; the deck size is the honest
  // count of distinct cards studied.
  const distinct = new Set(outcomes.map((outcome) => outcome.cardId)).size;
  const comfortable = tally.good + tally.easy;
  const struggled = tally.again + tally.hard;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <GlassCard className="items-center gap-3 text-center" tone="strong">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Sparkles aria-hidden="true" className="size-6" strokeWidth={1.9} />
        </span>
        <h2 className="font-display text-xl font-semibold text-foreground">
          {outcomes.length === 0 ? "Nothing reviewed" : "Session complete"}
        </h2>
        <p className="text-sm text-muted">
          {outcomes.length === 0
            ? "You ended the session before rating any cards."
            : `You reviewed ${distinct} ${distinct === 1 ? "card" : "cards"} in ${outcomes.length} ${outcomes.length === 1 ? "turn" : "turns"}.`}
        </p>
      </GlassCard>

      <div className="grid grid-cols-2 gap-3">
        <GlassStat label="Cards studied" value={distinct} />
        <GlassStat caption="Good or Easy" label="Comfortable" value={comfortable} />
        <GlassStat caption="Again or Hard" label="Difficult" value={struggled} />
        <GlassStat caption="Coming back soonest" label="To review" value={tally.again} />
      </div>

      {cards.length > 0 ? (
        <GlassCard>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Ratings</p>
          <div className="flex flex-wrap gap-2">
            {RATINGS.map((rating) => (
              <Chip
                color={rating.id === "again" ? "danger" : rating.id === "easy" ? "success" : "default"}
                key={rating.id}
                size="sm"
                variant="soft"
              >
                {rating.label} · {tally[rating.id]}
              </Chip>
            ))}
          </div>
        </GlassCard>
      ) : null}

      <div className="flex flex-wrap justify-center gap-2">
        <Button onPress={onDone} variant="primary">
          <Check aria-hidden="true" className="size-4" strokeWidth={2.1} />
          Done
        </Button>
        <Button onPress={onDone} variant="tertiary">
          <RotateCcw aria-hidden="true" className="size-4" strokeWidth={1.9} />
          Back to cards
        </Button>
      </div>
    </div>
  );
}
