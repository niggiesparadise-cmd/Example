"use client";

import { Button, cn } from "@heroui/react";
import { ArrowRight, Check, RotateCcw, Target, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { GlassCard, GlassStat } from "@/components/glass/glass-card";
import { GlassSurface } from "@/components/glass/glass-surface";
import { formatDuration } from "@/lib/format";
import type { FullQuiz } from "./api";

/**
 * Playing a quiz.
 *
 * One question at a time. Selecting an answer settles it immediately — right or
 * wrong, the correct option is shown and the explanation appears — and the
 * choice is then locked, because a quiz you can keep guessing at scores
 * nothing.
 *
 * The component is told what happened through `onFinished`; it does not write
 * anything itself, so the same screen serves a solo attempt and a challenge.
 */

export interface QuizOutcome {
  score: number;
  total: number;
  durationSeconds: number;
  incorrectQuestionIds: string[];
}

export function QuizPlayer({
  onExit,
  onFinished,
  quiz,
  reviewOnly,
  submitLabel = "Finish",
}: {
  onExit: () => void;
  onFinished: (outcome: QuizOutcome) => void;
  quiz: FullQuiz;
  /** Restricts the run to a subset — used by "review mistakes". */
  reviewOnly?: string[];
  submitLabel?: string;
}) {
  const questions = useMemo(
    () =>
      reviewOnly && reviewOnly.length > 0
        ? quiz.questions.filter((question) => reviewOnly.includes(question.id))
        : quiz.questions,
    [quiz.questions, reviewOnly],
  );

  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | undefined>(undefined);
  const [answers, setAnswers] = useState<{ questionId: string; correct: boolean }[]>([]);
  // Lazy initialiser, so the clock is read once in a callback rather than on
  // every render — see the note in the flashcard deck.
  const [startedAt] = useState(() => Date.now());

  const question = questions[index];
  const isLast = index === questions.length - 1;

  const choose = useCallback(
    (optionId: string) => {
      if (chosen || !question) return;
      setChosen(optionId);
      const correct = question.options.find((option) => option.id === optionId)?.is_correct ?? false;
      setAnswers((previous) => [...previous, { questionId: question.id, correct }]);
    },
    [chosen, question],
  );

  const next = useCallback(() => {
    if (!isLast) {
      setChosen(undefined);
      setIndex((previous) => previous + 1);
      return;
    }

    const correct = answers.filter((answer) => answer.correct).length;
    onFinished({
      score: correct,
      total: questions.length,
      durationSeconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
      incorrectQuestionIds: answers.filter((answer) => !answer.correct).map((answer) => answer.questionId),
    });
  }, [answers, isLast, onFinished, questions.length, startedAt]);

  if (!question) {
    return (
      <GlassCard className="mx-auto max-w-xl items-center gap-3 text-center" tone="strong">
        <p className="text-sm text-muted">This quiz has no questions yet.</p>
        <Button onPress={onExit} variant="primary">
          Back
        </Button>
      </GlassCard>
    );
  }

  const answered = Boolean(chosen);
  const progress = Math.round((index / questions.length) * 100);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="tabular text-muted">
          Question {index + 1} of {questions.length}
        </span>
        <span className="tabular text-muted">
          {answers.filter((answer) => answer.correct).length} correct
        </span>
      </div>

      <div
        aria-label="Quiz progress"
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

      <GlassSurface className="p-5" radius="lg" tone="strong">
        <h2 className="font-display text-lg leading-snug font-semibold text-balance text-foreground">
          {question.question}
        </h2>
      </GlassSurface>

      <ul className="flex flex-col gap-2.5">
        {question.options.map((option) => {
          const isChosen = chosen === option.id;
          const revealCorrect = answered && option.is_correct;
          const revealWrong = answered && isChosen && !option.is_correct;

          return (
            <li key={option.id}>
              <button
                aria-pressed={isChosen}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[var(--radius-glass)] border px-4 py-3.5 text-left",
                  "min-h-14 outline-none transition-colors duration-[var(--duration-glass)]",
                  "focus-visible:ring-2 focus-visible:ring-focus",
                  !answered && "border-border bg-surface hover:bg-surface-hover active:scale-[0.99]",
                  revealCorrect && "answer-correct border-success bg-success-soft text-success-soft-foreground",
                  revealWrong && "answer-wrong border-danger bg-danger-soft text-danger-soft-foreground",
                  answered && !revealCorrect && !revealWrong && "border-border bg-surface opacity-60",
                )}
                disabled={answered}
                onClick={() => choose(option.id)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    revealCorrect && "border-success bg-success text-white",
                    revealWrong && "border-danger bg-danger text-white",
                    !revealCorrect && !revealWrong && "border-border text-muted",
                  )}
                >
                  {revealCorrect ? (
                    <Check className="size-3.5" strokeWidth={2.6} />
                  ) : revealWrong ? (
                    <X className="size-3.5" strokeWidth={2.6} />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">{option.option_text}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* The explanation is the point of getting one wrong. */}
      {answered ? (
        <GlassSurface className="flip-face-in p-4" tone="subtle">
          <p className="text-sm font-semibold text-foreground">
            {answers[answers.length - 1]?.correct ? "Correct" : "Not quite"}
          </p>
          {question.explanation ? (
            <p className="mt-1 text-sm leading-relaxed text-muted">{question.explanation}</p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              {answers[answers.length - 1]?.correct
                ? "Nicely done."
                : "The correct answer is highlighted above."}
            </p>
          )}
        </GlassSurface>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <Button onPress={onExit} size="sm" variant="tertiary">
          Leave
        </Button>
        <Button isDisabled={!answered} onPress={next} size="lg" variant="primary">
          {isLast ? submitLabel : "Next"}
          <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2.1} />
        </Button>
      </div>
    </div>
  );
}

/** The score screen, shown after a solo attempt. */
export function QuizResult({
  onExit,
  onRetry,
  onReviewMistakes,
  outcome,
  title,
}: {
  onExit: () => void;
  onRetry: () => void;
  onReviewMistakes: () => void;
  outcome: QuizOutcome;
  title: string;
}) {
  const percentage = Math.round((outcome.score / Math.max(1, outcome.total)) * 100);
  const wrong = outcome.total - outcome.score;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <GlassCard className="items-center gap-2 text-center" tone="strong">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Target aria-hidden="true" className="size-6" strokeWidth={1.9} />
        </span>
        <p className="text-sm text-muted">{title}</p>
        <p className="tabular font-display text-4xl leading-none font-semibold text-foreground">
          {percentage}%
        </p>
        <p className="text-sm text-muted">
          {outcome.score} of {outcome.total} correct
        </p>
      </GlassCard>

      <div className="grid grid-cols-2 gap-3">
        <GlassStat label="Correct" value={outcome.score} />
        <GlassStat label="Incorrect" value={wrong} />
        <GlassStat label="Time spent" value={formatDuration(Math.max(1, Math.round(outcome.durationSeconds / 60)))} />
        <GlassStat label="To review" value={outcome.incorrectQuestionIds.length} />
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button onPress={onRetry} variant="primary">
          <RotateCcw aria-hidden="true" className="size-4" strokeWidth={2} />
          Retry quiz
        </Button>
        {outcome.incorrectQuestionIds.length > 0 ? (
          <Button onPress={onReviewMistakes} variant="secondary">
            Review mistakes
          </Button>
        ) : null}
        <Button onPress={onExit} variant="tertiary">
          Done
        </Button>
      </div>
    </div>
  );
}
