"use client";

import { useCallback } from "react";
import { countPendingInvitations, listChallenges } from "@/features/challenges/api";
import { countDueFlashcards, countReviewsSince, listFlashcards } from "@/features/flashcards/api";
import { listAttempts, listQuizzes } from "@/features/quizzes/api";
import { useQuery } from "@/features/shared/use-query";

export interface LearningSnapshot {
  dueCards: number;
  totalCards: number;
  reviewedToday: number;
  quizCount: number;
  /** Percentage of the most recent attempt, or null when there has been none. */
  lastScore: number | null;
  pendingInvitations: number;
  activeChallenges: number;
}

/**
 * The dashboard's view of flashcards, quizzes and challenges.
 *
 * Loaded separately from `useOverview` on purpose. The dashboard's core — the
 * schedule, tasks and analytics — should not wait on three features the user
 * may not have touched, and a failure here should leave the rest of the page
 * intact rather than replacing it with an error.
 *
 * The counts that can be answered by the database are: `head: true` count
 * queries return a number without transferring rows.
 */
export function useLearningSnapshot() {
  const run = useCallback(async (): Promise<LearningSnapshot> => {
    // Local midnight, so "today" means the user's today.
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    const [dueCards, cards, reviewedToday, quizzes, attempts, pending, challenges] = await Promise.all([
      countDueFlashcards(),
      listFlashcards(),
      countReviewsSince(midnight.toISOString()),
      listQuizzes(),
      listAttempts(1),
      countPendingInvitations(),
      listChallenges(),
    ]);

    const latest = attempts[0];

    return {
      dueCards,
      totalCards: cards.length,
      reviewedToday,
      quizCount: quizzes.length,
      lastScore: latest
        ? Math.round((latest.score / Math.max(1, latest.total_questions)) * 100)
        : null,
      pendingInvitations: pending,
      activeChallenges: challenges.filter((view) =>
        ["accepted", "active"].includes(view.challenge.status),
      ).length,
    };
  }, []);

  return useQuery(run, []);
}
