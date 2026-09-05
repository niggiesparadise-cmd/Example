import type { Insert, ScheduleEvent, Update } from "@/lib/supabase/database.types";
import { getSupabase, requireUserId, unwrap } from "../shared/api";

export type ScheduleEventInput = Insert<ScheduleEvent>;

/** Events in an inclusive ISO date range, ordered as they occur. */
export async function listEvents(from: string, to: string): Promise<ScheduleEvent[]> {
  return unwrap(
    await getSupabase()
      .from("schedule_events")
      .select("*")
      .gte("event_date", from)
      .lte("event_date", to)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true }),
  );
}

export async function createEvent(input: ScheduleEventInput): Promise<ScheduleEvent> {
  const user_id = await requireUserId();
  return unwrap(
    await getSupabase().from("schedule_events").insert({ ...input, user_id }).select().single(),
  );
}

export async function updateEvent(id: string, input: Update<ScheduleEvent>): Promise<ScheduleEvent> {
  return unwrap(
    await getSupabase().from("schedule_events").update(input).eq("id", id).select().single(),
  );
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await getSupabase().from("schedule_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
