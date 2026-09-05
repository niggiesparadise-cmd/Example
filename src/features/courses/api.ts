import type { Course, Insert, Lecture, Topic, Update } from "@/lib/supabase/database.types";
import { getSupabase, requireUserId, unwrap } from "../shared/api";

export type CourseInput = Insert<Course>;
export type TopicInput = Insert<Topic>;
export type LectureInput = Insert<Lecture>;

/** A course with the topic counts the UI needs to show progress. */
export interface CourseWithProgress extends Course {
  topic_count: number;
  topics_complete: number;
  /** 0–100, derived from topics. A course with no topics reads as 0. */
  progress: number;
}

export async function listCourses(): Promise<CourseWithProgress[]> {
  const supabase = getSupabase();

  // Two queries rather than one embedded select: PostgREST can return the join,
  // but typing it would mean hand-maintaining relationship metadata that drifts
  // silently from the migrations. At this data scale the extra round trip costs
  // nothing and the result stays fully typed with no casts.
  const [courses, topics] = await Promise.all([
    supabase.from("courses").select("*").order("code", { ascending: true }),
    supabase.from("topics").select("id, course_id, is_complete"),
  ]);

  const rows = unwrap(courses);
  const topicRows = unwrap(topics);

  const byCourse = new Map<string, { total: number; complete: number }>();
  for (const topic of topicRows) {
    const tally = byCourse.get(topic.course_id) ?? { total: 0, complete: 0 };
    tally.total += 1;
    if (topic.is_complete) tally.complete += 1;
    byCourse.set(topic.course_id, tally);
  }

  return rows.map((course) => {
    const tally = byCourse.get(course.id) ?? { total: 0, complete: 0 };
    return {
      ...course,
      topic_count: tally.total,
      topics_complete: tally.complete,
      progress: tally.total === 0 ? 0 : Math.round((tally.complete / tally.total) * 100),
    };
  });
}

export async function createCourse(input: CourseInput): Promise<Course> {
  const user_id = await requireUserId();
  return unwrap(await getSupabase().from("courses").insert({ ...input, user_id }).select().single());
}

export async function updateCourse(id: string, input: Update<Course>): Promise<Course> {
  return unwrap(await getSupabase().from("courses").update(input).eq("id", id).select().single());
}

/** Cascades to topics and lectures; tasks/exams/notes are orphaned, not deleted. */
export async function deleteCourse(id: string): Promise<void> {
  const { error } = await getSupabase().from("courses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listTopics(courseId: string): Promise<Topic[]> {
  return unwrap(
    await getSupabase().from("topics").select("*").eq("course_id", courseId).order("position"),
  );
}

export async function createTopic(input: TopicInput): Promise<Topic> {
  const user_id = await requireUserId();
  return unwrap(await getSupabase().from("topics").insert({ ...input, user_id }).select().single());
}

export async function setTopicComplete(id: string, isComplete: boolean): Promise<Topic> {
  return unwrap(
    await getSupabase().from("topics").update({ is_complete: isComplete }).eq("id", id).select().single(),
  );
}

export async function deleteTopic(id: string): Promise<void> {
  const { error } = await getSupabase().from("topics").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listLectures(courseId: string): Promise<Lecture[]> {
  return unwrap(
    await getSupabase().from("lectures").select("*").eq("course_id", courseId).order("position"),
  );
}

export async function createLecture(input: LectureInput): Promise<Lecture> {
  const user_id = await requireUserId();
  return unwrap(await getSupabase().from("lectures").insert({ ...input, user_id }).select().single());
}

export async function deleteLecture(id: string): Promise<void> {
  const { error } = await getSupabase().from("lectures").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
