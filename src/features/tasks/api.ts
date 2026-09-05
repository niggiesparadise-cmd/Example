import type { Insert, Task, TaskStatus, Update } from "@/lib/supabase/database.types";
import { getSupabase, requireUserId, unwrap } from "../shared/api";

export type TaskInput = Insert<Task>;

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

export async function updateTask(id: string, input: Update<Task>): Promise<Task> {
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
  const { error } = await getSupabase().from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
