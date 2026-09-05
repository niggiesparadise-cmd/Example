/**
 * Domain model for the study dashboard.
 *
 * Every entity is plain, serialisable data so it can move from the mock data
 * layer (`src/data`) to a real API without touching the UI components.
 */

/** Palette slot used to give a course a stable identity colour across the app. */
export type ColorSlot = 1 | 2 | 3 | 4 | 5;

/** ISO-8601 calendar date, e.g. `"2026-09-16"`. */
export type IsoDate = string;

/** 24-hour wall-clock time, e.g. `"09:30"`. */
export type TimeString = string;

/** Day of the week, 0 = Sunday … 6 = Saturday (matches `Date.getDay`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Course {
  id: string;
  code: string;
  title: string;
  instructor: string;
  credits: number;
  /** Room or lecture hall for the main meeting. */
  location: string;
  colorSlot: ColorSlot;
  /** Share of the syllabus completed, 0–100. */
  progress: number;
  /** Running weighted average for the course, 0–100. */
  grade: number;
  /** Letter equivalent of `grade`, precomputed for display. */
  letterGrade: string;
  /** Attendance rate so far, 0–100. */
  attendance: number;
  /** Total hours studied this term. */
  hoursStudied: number;
  /** Short syllabus blurb. */
  summary: string;
}

export type SessionKind = "lecture" | "lab" | "seminar" | "tutorial" | "study" | "exam";

export interface ScheduleEvent {
  id: string;
  courseId: string;
  title: string;
  kind: SessionKind;
  date: IsoDate;
  start: TimeString;
  end: TimeString;
  location: string;
  /** Optional note shown under the event title. */
  note?: string;
}

export type TaskStatus = "todo" | "in-progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TaskKind = "assignment" | "reading" | "problem-set" | "project" | "lab-report" | "revision";

export interface Task {
  id: string;
  courseId: string;
  title: string;
  kind: TaskKind;
  status: TaskStatus;
  priority: TaskPriority;
  due: IsoDate;
  /** Estimated effort in minutes. */
  estimateMinutes: number;
  /** Subtasks completed / total, used for the inline progress meter. */
  checklist: { done: number; total: number };
}

export type ExamKind = "midterm" | "final" | "quiz" | "practical" | "oral";

export interface Exam {
  id: string;
  courseId: string;
  title: string;
  kind: ExamKind;
  date: IsoDate;
  start: TimeString;
  end: TimeString;
  location: string;
  /** Share of the final grade, 0–100. */
  weight: number;
  /** Revision completed so far, 0–100. */
  preparation: number;
  topics: string[];
}

export interface Note {
  id: string;
  courseId: string;
  title: string;
  /** First line or two, shown in list previews. */
  excerpt: string;
  updated: IsoDate;
  wordCount: number;
  tags: string[];
  isPinned: boolean;
}

/** One logged study block, the raw material behind every analytics chart. */
export interface StudySession {
  id: string;
  courseId: string;
  date: IsoDate;
  minutes: number;
  /** Self-reported focus quality, 0–100. */
  focus: number;
}

export interface Student {
  name: string;
  /** Short form used in greetings. */
  firstName: string;
  program: string;
  year: string;
  term: string;
  /** 1-based index of the current teaching week. */
  currentWeek: number;
  totalWeeks: number;
  gpa: number;
  /** GPA change since the previous term. */
  gpaDelta: number;
  /** Daily study target in minutes, used as the goal line on charts. */
  dailyGoalMinutes: number;
  avatarInitials: string;
}
