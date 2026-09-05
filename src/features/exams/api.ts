import type { Exam, Insert, Update } from "@/lib/supabase/database.types";
import { getSupabase, requireUserId, unwrap } from "../shared/api";

export type ExamInput = Insert<Exam>;

export async function listExams(): Promise<Exam[]> {
  return unwrap(
    await getSupabase().from("exams").select("*").order("exam_date", { ascending: true }),
  );
}

export async function createExam(input: ExamInput): Promise<Exam> {
  const user_id = await requireUserId();
  return unwrap(await getSupabase().from("exams").insert({ ...input, user_id }).select().single());
}

export async function updateExam(id: string, input: Update<Exam>): Promise<Exam> {
  return unwrap(await getSupabase().from("exams").update(input).eq("id", id).select().single());
}

export async function deleteExam(id: string): Promise<void> {
  const { error } = await getSupabase().from("exams").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
