import type {
  Insert,
  Quiz,
  QuizAttempt,
  QuizOption,
  QuizQuestion,
  QuizQuestionKind,
} from "@/lib/supabase/database.types";
import { deleteRow, getSupabase, requireUserId, unwrap } from "../shared/api";

/**
 * Quizzes.
 *
 * A quiz is three tables — the quiz, its questions, and each question's options
 * — so this module's job is to keep the client from having to know that. It
 * reads them as three ordered queries and groups them here rather than asking
 * PostgREST for an embedded join, for the same reason `courses` does: the join
 * would need relationship metadata that drifts from the migrations without
 * anything noticing.
 */

export type QuizInput = Insert<Quiz>;

export interface QuestionDraft {
  id?: string;
  question: string;
  kind: QuizQuestionKind;
  explanation: string | null;
  options: { id?: string; option_text: string; is_correct: boolean }[];
}

/** A quiz with everything needed to play it. */
export interface FullQuiz {
  quiz: Quiz;
  questions: (QuizQuestion & { options: QuizOption[] })[];
}

export async function listQuizzes(): Promise<Quiz[]> {
  return unwrap(
    await getSupabase().from("quizzes").select("*").order("created_at", { ascending: false }),
  );
}

/** Question counts for a list of quizzes, in one round trip. */
export async function countQuestionsByQuiz(): Promise<Map<string, number>> {
  const rows = unwrap(await getSupabase().from("quiz_questions").select("id, quiz_id"));
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.quiz_id, (counts.get(row.quiz_id) ?? 0) + 1);
  return counts;
}

export async function loadQuiz(quizId: string): Promise<FullQuiz> {
  const supabase = getSupabase();

  const quiz: Quiz = unwrap(await supabase.from("quizzes").select("*").eq("id", quizId).single());
  const questions = unwrap(
    await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("position"),
  );

  if (questions.length === 0) return { quiz, questions: [] };

  const options = unwrap(
    await supabase
      .from("quiz_options")
      .select("*")
      .in(
        "question_id",
        questions.map((question) => question.id),
      )
      .order("position"),
  );

  const byQuestion = new Map<string, QuizOption[]>();
  for (const option of options) {
    const list = byQuestion.get(option.question_id) ?? [];
    list.push(option);
    byQuestion.set(option.question_id, list);
  }

  return {
    quiz,
    questions: questions.map((question) => ({
      ...question,
      options: byQuestion.get(question.id) ?? [],
    })),
  };
}

export async function createQuiz(input: QuizInput): Promise<Quiz> {
  const user_id = await requireUserId();
  return unwrap(await getSupabase().from("quizzes").insert({ ...input, user_id }).select().single());
}

export async function updateQuiz(id: string, input: Partial<QuizInput>): Promise<Quiz> {
  return unwrap(await getSupabase().from("quizzes").update(input).eq("id", id).select().single());
}

export async function deleteQuiz(id: string): Promise<void> {
  await deleteRow("quizzes", id);
}

/**
 * Replaces a quiz's questions wholesale.
 *
 * Editing a question set in place means diffing three tables against what the
 * user rearranged in a form; deleting and re-inserting is one obvious operation
 * instead. The cascade from `quiz_questions` takes the options with it. Attempts
 * reference the quiz rather than its questions, so history is not disturbed —
 * though the ids in an older attempt's `incorrect_question_ids` will no longer
 * resolve, which is why "review mistakes" is offered from the attempt you just
 * finished rather than from history.
 */
export async function replaceQuestions(quizId: string, drafts: QuestionDraft[]): Promise<void> {
  const supabase = getSupabase();

  const { error: clearError } = await supabase.from("quiz_questions").delete().eq("quiz_id", quizId);
  if (clearError) throw new Error(clearError.message);

  if (drafts.length === 0) return;

  const inserted = unwrap(
    await supabase
      .from("quiz_questions")
      .insert(
        drafts.map((draft, index) => ({
          quiz_id: quizId,
          question: draft.question.trim(),
          kind: draft.kind,
          explanation: draft.explanation?.trim() || null,
          position: index,
        })),
      )
      .select(),
  );

  // `insert` returns rows in the order they were sent, so position lines up.
  const options = inserted.flatMap((question, index) =>
    drafts[index].options.map((option, optionIndex) => ({
      question_id: question.id,
      option_text: option.option_text.trim(),
      is_correct: option.is_correct,
      position: optionIndex,
    })),
  );

  if (options.length > 0) {
    const { error } = await supabase.from("quiz_options").insert(options);
    if (error) throw new Error(error.message);
  }
}

export async function recordAttempt(input: {
  quizId: string;
  score: number;
  totalQuestions: number;
  durationSeconds: number;
  incorrectQuestionIds: string[];
}): Promise<QuizAttempt> {
  const user_id = await requireUserId();
  return unwrap(
    await getSupabase()
      .from("quiz_attempts")
      .insert({
        user_id,
        quiz_id: input.quizId,
        score: input.score,
        total_questions: input.totalQuestions,
        duration_seconds: input.durationSeconds,
        incorrect_question_ids: input.incorrectQuestionIds,
      })
      .select()
      .single(),
  );
}

export async function listAttempts(limit = 20): Promise<QuizAttempt[]> {
  return unwrap(
    await getSupabase()
      .from("quiz_attempts")
      .select("*")
      .order("completed_at", { ascending: false })
      .limit(limit),
  );
}
