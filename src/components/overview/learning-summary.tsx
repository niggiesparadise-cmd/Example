"use client";

import { Chip } from "@heroui/react";
import { ClipboardList, Layers, Swords } from "lucide-react";
import { GlassStat } from "@/components/glass/glass-card";
import type { LearningSnapshot } from "@/features/overview/use-learning-snapshot";

/**
 * The dashboard's row for the three new sections.
 *
 * Three tiles, one per feature, each a link into the section it summarises —
 * deliberately shallow. The dashboard's job is to say what needs attention, and
 * a fourth panel of detail would compete with the schedule and task lists that
 * are already the page's centre of gravity.
 *
 * Nothing is shown for a feature the user has not started using: an account
 * with no flashcards gets no flashcard tile rather than a zero.
 */
export function LearningSummary({ snapshot }: { snapshot: LearningSnapshot }) {
  const showFlashcards = snapshot.totalCards > 0;
  const showQuizzes = snapshot.quizCount > 0;
  const showChallenges = snapshot.pendingInvitations > 0 || snapshot.activeChallenges > 0;

  if (!showFlashcards && !showQuizzes && !showChallenges) return null;

  return (
    <section aria-label="Study tools" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {showFlashcards ? (
        <GlassStat
          caption={
            snapshot.reviewedToday > 0
              ? `${snapshot.reviewedToday} reviewed today`
              : snapshot.dueCards > 0
                ? "Ready to review"
                : "All caught up"
          }
          href="/flashcards/"
          icon={<Layers aria-hidden="true" className="size-3.5" strokeWidth={2} />}
          label="Cards due"
          value={snapshot.dueCards}
        />
      ) : null}

      {showQuizzes ? (
        <GlassStat
          caption={
            snapshot.lastScore === null ? "No attempts yet" : `Last score ${snapshot.lastScore}%`
          }
          href="/quizzes/"
          icon={<ClipboardList aria-hidden="true" className="size-3.5" strokeWidth={2} />}
          label="Quizzes"
          value={snapshot.quizCount}
        />
      ) : null}

      {showChallenges ? (
        <GlassStat
          caption={
            snapshot.pendingInvitations > 0
              ? `${snapshot.pendingInvitations} waiting on you`
              : "In progress"
          }
          href="/challenges/"
          icon={<Swords aria-hidden="true" className="size-3.5" strokeWidth={2} />}
          label="Challenges"
          value={
            <span className="flex items-baseline gap-2">
              {snapshot.activeChallenges + snapshot.pendingInvitations}
              {snapshot.pendingInvitations > 0 ? (
                <Chip color="danger" size="sm" variant="soft">
                  New
                </Chip>
              ) : null}
            </span>
          }
        />
      ) : null}
    </section>
  );
}
