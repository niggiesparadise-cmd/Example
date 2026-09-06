"use client";

import { Button, Card, Chip } from "@heroui/react";
import { Check, Play, Swords, X } from "lucide-react";
import { useCallback, useState } from "react";
import { GlassSurface } from "@/components/glass/glass-surface";
import { ErrorState, ListSkeleton, LoadingRegion, NoData } from "@/components/ui/data-states";
import { PageHeader } from "@/components/ui/page-header";
import {
  listChallenges,
  respondToChallenge,
  submitChallengeResult,
  type ChallengeView,
} from "@/features/challenges/api";
import { ChallengeResult } from "@/features/challenges/challenge-result";
import { ProfileAvatar } from "@/features/profile/user-avatar";
import { loadQuiz, type FullQuiz } from "@/features/quizzes/api";
import { QuizPlayer, type QuizOutcome } from "@/features/quizzes/quiz-player";
import { useMutation } from "@/features/shared/use-mutation";
import { useQuery } from "@/features/shared/use-query";
import type { ChallengeStatus } from "@/lib/supabase/database.types";

const STATUS_LABEL: Record<ChallengeStatus, string> = {
  pending: "Invitation sent",
  accepted: "Accepted",
  declined: "Declined",
  active: "In progress",
  completed: "Finished",
  expired: "Expired",
};

export default function ChallengesPage() {
  const { data, error, isLoading, refetch } = useQuery(useCallback(() => listChallenges(), []), []);
  const [playing, setPlaying] = useState<{ view: ChallengeView; quiz: FullQuiz } | undefined>(undefined);

  const respond = useMutation(
    async (id: string, accept: boolean) => respondToChallenge(id, accept),
    {
      successMessage: (status) => (status === "accepted" ? "Challenge accepted." : "Challenge declined."),
      errorMessage: "Couldn't answer that invitation",
      onSuccess: () => void refetch(),
    },
  );

  const open = useMutation(
    async (view: ChallengeView) => ({ view, quiz: await loadQuiz(view.challenge.quiz_id) }),
    { errorMessage: "Couldn't open the quiz", onSuccess: (loaded) => setPlaying(loaded) },
  );

  const submit = useMutation(
    async (view: ChallengeView, outcome: QuizOutcome) =>
      submitChallengeResult({
        challengeId: view.challenge.id,
        score: outcome.score,
        totalQuestions: outcome.total,
        durationSeconds: outcome.durationSeconds,
      }),
    {
      successMessage: (status) =>
        status === "completed" ? "Both finished — see the result." : "Result recorded.",
      errorMessage: "Couldn't record your result",
      onSuccess: () => {
        setPlaying(undefined);
        void refetch();
      },
    },
  );

  if (playing) {
    return (
      <QuizPlayer
        onExit={() => setPlaying(undefined)}
        onFinished={(outcome) => void submit.mutate(playing.view, outcome)}
        quiz={playing.quiz}
        submitLabel="Submit result"
      />
    );
  }

  const views = data ?? [];
  const invitations = views.filter(
    (view) => view.challenge.status === "pending" && !view.isCreator,
  );
  const rest = views.filter((view) => !invitations.includes(view));

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader
        description={
          views.length === 0
            ? "Take the same quiz as a friend and compare."
            : `${views.length} ${views.length === 1 ? "challenge" : "challenges"}`
        }
        title="Challenges"
      />

      {isLoading ? (
        <>
          <LoadingRegion label="Loading challenges" />
          <ListSkeleton rows={3} />
        </>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load your challenges" />
      ) : views.length === 0 ? (
        <Card className="border border-border p-8">
          <NoData
            description="Open a quiz and tap Challenge to invite somebody by username."
            icon={<Swords aria-hidden="true" className="size-5" strokeWidth={1.75} />}
            title="No challenges yet"
          />
        </Card>
      ) : (
        <>
          {invitations.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
                Waiting for you
              </h2>
              {invitations.map((view) => (
                <GlassSurface className="flex flex-col gap-3 p-4" key={view.challenge.id}>
                  <div className="flex items-center gap-3">
                    <ProfileAvatar profile={view.opponent} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {view.challenge.title}
                      </p>
                      <p className="truncate text-xs text-muted">
                        from {view.opponent?.full_name ?? view.opponent?.username ?? "a classmate"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      isDisabled={respond.isPending}
                      onPress={() => void respond.mutate(view.challenge.id, true)}
                      size="sm"
                      variant="primary"
                    >
                      <Check aria-hidden="true" className="size-4" strokeWidth={2.3} />
                      Accept
                    </Button>
                    <Button
                      isDisabled={respond.isPending}
                      onPress={() => void respond.mutate(view.challenge.id, false)}
                      size="sm"
                      variant="tertiary"
                    >
                      <X aria-hidden="true" className="size-4" strokeWidth={2.3} />
                      Decline
                    </Button>
                  </div>
                </GlassSurface>
              ))}
            </section>
          ) : null}

          <section className="flex flex-col gap-3">
            {invitations.length > 0 ? (
              <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Everything else</h2>
            ) : null}

            {rest.map((view) => {
              const canPlay =
                (view.challenge.status === "accepted" || view.challenge.status === "active") &&
                !view.me?.completed_at;
              const isFinished = view.challenge.status === "completed";

              return (
                <div className="flex flex-col gap-3" key={view.challenge.id}>
                  <GlassSurface className="flex flex-col gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <ProfileAvatar profile={view.opponent} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {view.challenge.title}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {view.isCreator ? "You challenged" : "Challenged by"}{" "}
                          {view.opponent?.full_name ?? view.opponent?.username ?? "a classmate"}
                        </p>
                      </div>
                      <Chip
                        color={isFinished ? "success" : view.challenge.status === "declined" ? "default" : "accent"}
                        size="sm"
                        variant="soft"
                      >
                        {STATUS_LABEL[view.challenge.status]}
                      </Chip>
                    </div>

                    {canPlay ? (
                      <Button
                        className="self-start"
                        isDisabled={open.isPending}
                        onPress={() => void open.mutate(view)}
                        size="sm"
                        variant="primary"
                      >
                        <Play aria-hidden="true" className="size-4" strokeWidth={2.2} />
                        {open.isPending ? "Loading…" : "Take the quiz"}
                      </Button>
                    ) : view.me?.completed_at && !view.them?.completed_at ? (
                      <p className="text-xs text-muted">
                        You&apos;re done — waiting for your opponent to finish.
                      </p>
                    ) : null}
                  </GlassSurface>

                  {isFinished ? <ChallengeResult view={view} /> : null}
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
