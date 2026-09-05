import { createCourse, createTopic } from "@/features/courses/api";
import { createExam } from "@/features/exams/api";
import { createNote } from "@/features/notes/api";
import { createEvent } from "@/features/schedule/api";
import { getSupabase, requireUserId } from "@/features/shared/api";
import { createTask } from "@/features/tasks/api";
import { addDays, todayIso } from "@/lib/date";
import {
  demoCourseWeights,
  demoCourses,
  demoExams,
  demoNotes,
  demoTasks,
  demoWeeklyEvents,
} from "./demo-data";

/**
 * Seeds the demo dataset into the signed-in user's account.
 *
 * Everything goes through the same API the UI uses, so this exercises the real
 * write path (and the RLS policies) rather than bypassing them. It is a
 * development and testing aid, not part of the product's data flow.
 */

/** Deterministic PRNG so a seeded account looks the same every time. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export interface SeedProgress {
  step: string;
  done: number;
  total: number;
}

const SESSION_HISTORY_DAYS = 30;
const WEEKS_OF_SCHEDULE = 4;

export async function seedDemoData(onProgress?: (progress: SeedProgress) => void): Promise<void> {
  const userId = await requireUserId();
  const today = todayIso();
  const total = 6;
  let done = 0;
  const step = (label: string) => onProgress?.({ step: label, done: done++, total });

  // ---- courses and their topics
  step("Creating courses");
  const courseIdByCode = new Map<string, string>();
  for (const demo of demoCourses) {
    const course = await createCourse({
      code: demo.code,
      title: demo.title,
      instructor: demo.instructor,
      credits: demo.credits,
      location: demo.location,
      color_slot: demo.color_slot,
      grade: demo.grade,
      attendance: demo.attendance,
      summary: demo.summary,
    });
    courseIdByCode.set(demo.code, course.id);

    for (const [index, topic] of demo.topics.entries()) {
      await createTopic({
        course_id: course.id,
        title: topic.title,
        position: index,
        is_complete: topic.is_complete,
      });
    }
  }

  // ---- tasks
  step("Creating tasks");
  for (const demo of demoTasks) {
    await createTask({
      course_id: demo.courseCode ? (courseIdByCode.get(demo.courseCode) ?? null) : null,
      title: demo.title,
      kind: demo.kind,
      status: demo.status,
      priority: demo.priority,
      due_date: addDays(today, demo.dueOffset),
      estimate_minutes: demo.estimate_minutes,
      checklist_done: demo.checklist_done,
      checklist_total: demo.checklist_total,
      // A trigger fills this in from `status`; sending it would risk disagreeing.
      completed_at: null,
    });
  }

  // ---- exams
  step("Creating exams");
  for (const demo of demoExams) {
    await createExam({
      course_id: courseIdByCode.get(demo.courseCode) ?? null,
      title: demo.title,
      kind: demo.kind,
      exam_date: addDays(today, demo.dayOffset),
      start_time: demo.start_time,
      end_time: demo.end_time,
      location: demo.location,
      weight: demo.weight,
      preparation: demo.preparation,
      topics: demo.topics,
      notes: null,
    });
  }

  // ---- notes
  step("Creating notes");
  for (const demo of demoNotes) {
    await createNote({
      course_id: courseIdByCode.get(demo.courseCode) ?? null,
      topic_id: null,
      title: demo.title,
      content: demo.content,
      tags: demo.tags,
      is_pinned: demo.is_pinned,
    });
  }

  // ---- timetable, expanded across the coming weeks
  step("Creating schedule");
  const monday = startOfWeek(today);
  for (let week = 0; week < WEEKS_OF_SCHEDULE; week += 1) {
    for (const demo of demoWeeklyEvents) {
      await createEvent({
        course_id: courseIdByCode.get(demo.courseCode) ?? null,
        title: demo.title,
        kind: demo.kind,
        event_date: addDays(monday, week * 7 + (demo.weekday - 1)),
        start_time: demo.start_time,
        end_time: demo.end_time,
        location: demo.location,
        note: null,
      });
    }
  }

  // ---- study history
  //
  // Inserted in one batch rather than through startSession/stopSession: those
  // enforce "one running timer", which historical rows would trip over.
  step("Creating study history");
  const random = mulberry32(20_260_916);
  const weekdayLoad = [0.55, 1, 1, 1.05, 0.95, 0.8, 0.4];
  const rows: {
    user_id: string;
    course_id: string | null;
    started_at: string;
    ended_at: string;
    focus: number;
    note: null;
  }[] = [];

  for (let dayIndex = 0; dayIndex < SESSION_HISTORY_DAYS; dayIndex += 1) {
    const date = addDays(today, -(SESSION_HISTORY_DAYS - 1 - dayIndex));
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const dayTotal = 190 * weekdayLoad[weekday] * (0.75 + 0.5 * random());

    let startHour = 9;
    for (const demo of demoCourses) {
      const share = demoCourseWeights[demo.code] ?? 0.1;
      const minutes = Math.round((dayTotal * share * (0.55 + 0.9 * random())) / 15) * 15;
      if (minutes < 30) continue;

      const startedAt = new Date(`${date}T00:00:00`);
      startedAt.setHours(startHour, 0, 0, 0);
      const endedAt = new Date(startedAt.getTime() + minutes * 60_000);
      startHour = Math.min(20, startHour + Math.ceil(minutes / 60) + 1);

      rows.push({
        user_id: userId,
        course_id: courseIdByCode.get(demo.code) ?? null,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        focus: Math.round(62 + 30 * random()),
        note: null,
      });
    }
  }

  const { error } = await getSupabase().from("study_sessions").insert(rows);
  if (error) throw new Error(error.message);

  onProgress?.({ step: "Done", done: total, total });
}

/**
 * Deletes everything the signed-in user owns.
 *
 * Courses cascade to topics and lectures; the rest are removed explicitly.
 * RLS scopes each delete to the caller, so this cannot reach another account.
 */
export async function clearMyData(): Promise<void> {
  const supabase = getSupabase();
  const userId = await requireUserId();

  for (const table of ["study_sessions", "schedule_events", "notes", "exams", "tasks", "courses"] as const) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(`Couldn't clear ${table}: ${error.message}`);
  }
}

function startOfWeek(iso: string): string {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return addDays(iso, day === 0 ? -6 : 1 - day);
}
