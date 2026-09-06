import type { Insert, Task, TaskStatus } from "@/lib/supabase/database.types";
import { deleteRow, getSupabase, requireUserId, unwrap } from "../shared/api";

/** `completed_at` is excluded — the completion trigger owns it. */
export type TaskInput = Omit<Insert<Task>, "completed_at">;

export async function listTasks(): Promise<Task[]> {
  return unwrap(
    await getSupabase()
      .from("tasks")
      .select("*")
      // Nulls last so undated tasks sink to the bottom of the list.
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
  );
}

export async function createTask(input: TaskInput): Promise<Task> {
  const user_id = await requireUserId();
  return unwrap(await getSupabase().from("tasks").insert({ ...input, user_id }).select().single());
}

export async function updateTask(id: string, input: Partial<TaskInput>): Promise<Task> {
  return unwrap(await getSupabase().from("tasks").update(input).eq("id", id).select().single());
}

/**
 * Toggles completion.
 *
 * `completed_at` is deliberately not sent: a database trigger sets and clears it
 * from `status`, so the two can never disagree even if a client forgets.
 */
export async function setTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  return unwrap(await getSupabase().from("tasks").update({ status }).eq("id", id).select().single());
}

export async function deleteTask(id: string): Promise<void> {
  await deleteRow("tasks", id);
}
