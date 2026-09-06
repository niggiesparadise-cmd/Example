"use client";

import { Button, Card, Chip } from "@heroui/react";
import { ClipboardList, Pencil, Play, Plus, Swords, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { CourseDot } from "@/components/ui/course-dot";
import { ErrorState, ListSkeleton, LoadingRegion, NoData } from "@/components/ui/data-states";
import { ConfirmDeleteDialog } from "@/components/ui/form-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { ChallengeDialog } from "@/features/challenges/challenge-dialog";
import { listAllTopics, listCourses } from "@/features/courses/api";
import {
  countQuestionsByQuiz,
  deleteQuiz,
  listAttempts,
  listQuizzes,
  loadQuiz,
  recordAttempt,
  type FullQuiz,
} from "@/features/quizzes/api";
import { QuizFormDialog } from "@/features/quizzes/quiz-form";
import { QuizPlayer, QuizResult, type QuizOutcome } from "@/features/quizzes/quiz-player";
import { useMutation } from "@/features/shared/use-mutation";
import { useQuery } from "@/features/shared/use-query";
import type { Quiz } from "@/lib/supabase/database.types";

type Mode =
  | { kind: "list" }
  | { kind: "playing"; quiz: FullQuiz; reviewOnly?: string[] }
  | { kind: "result"; quiz: FullQuiz; outcome: QuizOutcome };

export default function QuizzesPage() {
  const load = useCallback(async () => {
    const [quizzes, counts, courses, topics, attempts] = await Promise.all([
      listQuizzes(),
      countQuestionsByQuiz(),
      listCourses(),
      listAllTopics(),
      listAttempts(50),
    ]);
    return { quizzes, counts, courses, topics, attempts };
  }, []);

  const { data, error, isLoading, refetch } = useQuery(load, []);

  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [editing, setEditing] = useState<FullQuiz | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Quiz | undefined>(undefined);
  const [challenging, setChallenging] = useState<Quiz | undefined>(undefined);

  const remove = useMutation(async (id: string) => deleteQuiz(id), {
    successMessage: "Quiz deleted.",
    errorMessage: "Couldn't delete the quiz",
    onSuccess: () => {
      setPendingDelete(undefined);
      void refetch();
    },
  });

  // Questions and options are only fetched when a quiz is actually opened —
  // the list itself never needs them.
  const play = useMutation(async (id: string) => loadQuiz(id), {
    errorMessage: "Couldn't open the quiz",
    onSuccess: (full) => setMode({ kind: "playing", quiz: full }),
  });

  const edit = useMutation(async (id: string) => loadQuiz(id), {
    errorMessage: "Couldn't open the quiz",
    onSuccess: (full) => {
      setEditing(full);
      setIsFormOpen(true);
    },
  });

  const finish = useMutation(
    async (quiz: FullQuiz, outcome: QuizOutcome) => {
      await recordAttempt({
        quizId: quiz.quiz.id,
        score: outcome.score,
        totalQuestions: outcome.total,
        durationSeconds: outcome.durationSeconds,
        incorrectQuestionIds: outcome.incorrectQuestionIds,
      });
      return { quiz, outcome };
    },
    {
      errorMessage: "Couldn't save your attempt",
      onSuccess: ({ outcome, quiz }) => {
        setMode({ kind: "result", quiz, outcome });
        void refetch();
      },
    },
  );

  if (mode.kind === "playing") {
    return (
      <QuizPlayer
        onExit={() => setMode({ kind: "list" })}
        onFinished={(outcome) => void finish.mutate(mode.quiz, outcome)}
        quiz={mode.quiz}
        reviewOnly={mode.reviewOnly}
      />
    );
  }

  if (mode.kind === "result") {
    return (
      <QuizResult
        onExit={() => setMode({ kind: "list" })}
        onRetry={() => setMode({ kind: "playing", quiz: mode.quiz })}
        onReviewMistakes={() =>
          setMode({ kind: "playing", quiz: mode.quiz, reviewOnly: mode.outcome.incorrectQuestionIds })
        }
        outcome={mode.outcome}
        title={mode.quiz.quiz.title}
      />
    );
  }

  const quizzes = data?.quizzes ?? [];
  const courses = data?.courses ?? [];
  const counts = data?.counts ?? new Map<string, number>();
  const courseById = new Map(courses.map((course) => [course.id, course]));

  // Most recent attempt per quiz, for the "last score" chip.
  const lastScore = new Map<string, { score: number; total: number }>();
  for (const attempt of data?.attempts ?? []) {
    if (!lastScore.has(attempt.quiz_id)) {
      lastScore.set(attempt.quiz_id, { score: attempt.score, total: attempt.total_questions });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader
        actions={
          <Button
            onPress={() => {
              setEditing(undefined);
              setIsFormOpen(true);
            }}
            size="sm"
            variant="primary"
          >
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
            New quiz
          </Button>
        }
        description={
          quizzes.length === 0
            ? "Write questions, then test yourself — or a friend."
            : `${quizzes.length} ${quizzes.length === 1 ? "quiz" : "quizzes"}`
        }
        title="Quizzes"
      />

      {isLoading ? (
        <>
          <LoadingRegion label="Loading quizzes" />
          <ListSkeleton rows={3} />
        </>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load your quizzes" />
      ) : quizzes.length === 0 ? (
        <Card className="border border-border p-8">
          <NoData
            action={
              <Button onPress={() => setIsFormOpen(true)} size="sm" variant="primary">
                <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
                Create your first quiz
              </Button>
            }
            description="Multiple choice or true/false, with an explanation for each answer."
            icon={<ClipboardList aria-hidden="true" className="size-5" strokeWidth={1.75} />}
            title="No quizzes yet"
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((quiz) => {
            const course = quiz.course_id ? courseById.get(quiz.course_id) : undefined;
            const questionCount = counts.get(quiz.id) ?? 0;
            const previous = lastScore.get(quiz.id);

            return (
              <li key={quiz.id}>
                <Card className="flex h-full flex-col border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="min-w-0 flex-1 text-sm font-semibold text-foreground">{quiz.title}</h2>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        aria-label={`Edit ${quiz.title}`}
                        isDisabled={edit.isPending}
                        isIconOnly
                        onPress={() => void edit.mutate(quiz.id)}
                        size="sm"
                        variant="ghost"
                      >
                        <Pencil aria-hidden="true" className="size-4" strokeWidth={1.85} />
                      </Button>
                      <Button
                        aria-label={`Delete ${quiz.title}`}
                        isIconOnly
                        onPress={() => setPendingDelete(quiz)}
                        size="sm"
                        variant="ghost"
                      >
                        <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.85} />
                      </Button>
                    </div>
                  </div>

                  {quiz.description ? (
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted">{quiz.description}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted">
                    {course ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CourseDot course={course} />
                        {course.code}
                      </span>
                    ) : null}
                    <span className="tabular">
                      {questionCount} {questionCount === 1 ? "question" : "questions"}
                    </span>
                    {previous ? (
                      <Chip size="sm" variant="soft">
                        Last: {Math.round((previous.score / Math.max(1, previous.total)) * 100)}%
                      </Chip>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      isDisabled={questionCount === 0 || play.isPending}
                      onPress={() => void play.mutate(quiz.id)}
                      size="sm"
                      variant="primary"
                    >
                      <Play aria-hidden="true" className="size-4" strokeWidth={2.2} />
                      Start
                    </Button>
                    <Button
                      isDisabled={questionCount === 0}
                      onPress={() => setChallenging(quiz)}
                      size="sm"
                      variant="secondary"
                    >
                      <Swords aria-hidden="true" className="size-4" strokeWidth={2} />
                      Challenge
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {isFormOpen ? (
        <QuizFormDialog
          courses={courses}
          existing={editing}
          isOpen={isFormOpen}
          key={editing?.quiz.id ?? "new"}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditing(undefined);
          }}
          onSaved={refetch}
          topics={data?.topics ?? []}
        />
      ) : null}

      {challenging ? (
        <ChallengeDialog
          isOpen
          key={challenging.id}
          onOpenChange={(open: boolean) => {
            if (!open) setChallenging(undefined);
          }}
          quiz={challenging}
        />
      ) : null}

      <ConfirmDeleteDialog
        description={
          pendingDelete
            ? `"${pendingDelete.title}", its questions and every attempt at it will be permanently deleted.`
            : ""
        }
        isOpen={Boolean(pendingDelete)}
        isPending={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) void remove.mutate(pendingDelete.id);
        }}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(undefined);
        }}
        title="Delete this quiz?"
      />
    </div>
  );
}
