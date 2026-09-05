import type { ColorSlot, ExamKind, SessionKind, TaskKind, TaskPriority, TaskStatus } from "@/lib/supabase/database.types";

/**
 * The demo dataset, kept as a development and testing aid.
 *
 * This is the mock data the dashboard used to render directly. It is no longer
 * wired into any screen — it exists only to populate a real account through the
 * normal Supabase write path, which makes it useful for exercising populated vs
 * empty states without hand-entering thirty records.
 *
 * Dates are offsets from the day it is seeded, so the data always looks current.
 */

export interface DemoCourse {
  code: string;
  title: string;
  instructor: string;
  credits: number;
  location: string;
  color_slot: ColorSlot;
  grade: number;
  attendance: number;
  summary: string;
  topics: { title: string; is_complete: boolean }[];
}

export const demoCourses: DemoCourse[] = [
  {
    code: "CS 3410", title: "Data Structures & Algorithms", instructor: "Prof. Elena Márquez",
    credits: 4, location: "Turing Hall 204", color_slot: 1, grade: 91, attendance: 100,
    summary: "Amortised analysis, balanced trees, graph algorithms and NP-completeness.",
    topics: [
      { title: "Amortised analysis", is_complete: true },
      { title: "Balanced trees", is_complete: true },
      { title: "Shortest paths", is_complete: true },
      { title: "Greedy proofs", is_complete: false },
      { title: "Network flow", is_complete: false },
      { title: "NP-completeness", is_complete: false },
    ],
  },
  {
    code: "MATH 2210", title: "Linear Algebra", instructor: "Dr. Samuel Whitfield",
    credits: 3, location: "Noether 118", color_slot: 2, grade: 87, attendance: 92,
    summary: "Vector spaces, eigendecomposition, orthogonality and the SVD.",
    topics: [
      { title: "Vector spaces", is_complete: true },
      { title: "Eigenvalues", is_complete: true },
      { title: "Orthogonality", is_complete: false },
      { title: "Singular value decomposition", is_complete: false },
    ],
  },
  {
    code: "CS 3200", title: "Database Systems", instructor: "Prof. Nadia Haddad",
    credits: 3, location: "Codd Lab 3", color_slot: 3, grade: 94, attendance: 96,
    summary: "Relational design, query planning, transactions and distributed storage.",
    topics: [
      { title: "Relational algebra", is_complete: true },
      { title: "Normalisation", is_complete: true },
      { title: "Query planning", is_complete: false },
      { title: "Transactions", is_complete: false },
      { title: "Distributed storage", is_complete: false },
    ],
  },
  {
    code: "PHYS 1120", title: "Electromagnetism", instructor: "Dr. Ingrid Sørensen",
    credits: 4, location: "Faraday Theatre A", color_slot: 4, grade: 83, attendance: 88,
    summary: "Electrostatics, magnetic fields, induction and Maxwell's equations.",
    topics: [
      { title: "Electrostatics", is_complete: true },
      { title: "Magnetic fields", is_complete: false },
      { title: "Induction", is_complete: false },
      { title: "Maxwell's equations", is_complete: false },
    ],
  },
  {
    code: "ENG 2150", title: "Technical Writing", instructor: "Prof. Daniel Cho",
    credits: 2, location: "Seminar Room 12", color_slot: 5, grade: 92, attendance: 100,
    summary: "Specifications, design documents and writing for technical audiences.",
    topics: [
      { title: "Audience analysis", is_complete: true },
      { title: "Design documents", is_complete: true },
      { title: "Editing and review", is_complete: false },
    ],
  },
];

export interface DemoTask {
  courseCode: string | null;
  title: string;
  kind: TaskKind;
  status: TaskStatus;
  priority: TaskPriority;
  /** Days from the seed date; negative is overdue or already done. */
  dueOffset: number;
  estimate_minutes: number;
  checklist_done: number;
  checklist_total: number;
}

export const demoTasks: DemoTask[] = [
  { courseCode: "CS 3410", title: "Problem Set 3 — Amortised Analysis", kind: "problem-set", status: "in-progress", priority: "high", dueOffset: 0, estimate_minutes: 150, checklist_done: 4, checklist_total: 6 },
  { courseCode: "CS 3200", title: "Normalise the campus events schema to 3NF", kind: "assignment", status: "in-progress", priority: "high", dueOffset: 1, estimate_minutes: 120, checklist_done: 2, checklist_total: 5 },
  { courseCode: "PHYS 1120", title: "Lab Report — Faraday Induction", kind: "lab-report", status: "todo", priority: "high", dueOffset: 2, estimate_minutes: 180, checklist_done: 0, checklist_total: 4 },
  { courseCode: "MATH 2210", title: "Chapter 4 — Orthogonal Projections", kind: "reading", status: "todo", priority: "medium", dueOffset: 2, estimate_minutes: 60, checklist_done: 0, checklist_total: 3 },
  { courseCode: "ENG 2150", title: "Design document draft for peer review", kind: "assignment", status: "in-progress", priority: "medium", dueOffset: 3, estimate_minutes: 90, checklist_done: 3, checklist_total: 4 },
  { courseCode: "MATH 2210", title: "Quiz 2 revision — eigenvalues", kind: "revision", status: "todo", priority: "high", dueOffset: 4, estimate_minutes: 120, checklist_done: 1, checklist_total: 5 },
  { courseCode: "CS 3410", title: "Midterm revision — graph algorithms", kind: "revision", status: "todo", priority: "medium", dueOffset: 6, estimate_minutes: 240, checklist_done: 0, checklist_total: 8 },
  { courseCode: "CS 3200", title: "Read: Query optimisation, chapters 12–13", kind: "reading", status: "todo", priority: "low", dueOffset: 7, estimate_minutes: 75, checklist_done: 0, checklist_total: 2 },
  { courseCode: "CS 3200", title: "Term project proposal — data model", kind: "project", status: "todo", priority: "medium", dueOffset: 9, estimate_minutes: 200, checklist_done: 0, checklist_total: 6 },
  { courseCode: "PHYS 1120", title: "Problem Set 2 — Gauss's Law", kind: "problem-set", status: "done", priority: "medium", dueOffset: -1, estimate_minutes: 120, checklist_done: 5, checklist_total: 5 },
  { courseCode: "ENG 2150", title: "Peer review — two classmate drafts", kind: "assignment", status: "done", priority: "low", dueOffset: -2, estimate_minutes: 45, checklist_done: 2, checklist_total: 2 },
  { courseCode: "CS 3410", title: "Problem Set 2 — Balanced trees", kind: "problem-set", status: "done", priority: "high", dueOffset: -5, estimate_minutes: 150, checklist_done: 6, checklist_total: 6 },
  { courseCode: "MATH 2210", title: "Weekly exercises 3.1–3.8", kind: "problem-set", status: "done", priority: "medium", dueOffset: -3, estimate_minutes: 90, checklist_done: 8, checklist_total: 8 },
];

export interface DemoExam {
  courseCode: string;
  title: string;
  kind: ExamKind;
  dayOffset: number;
  start_time: string;
  end_time: string;
  location: string;
  weight: number;
  preparation: number;
  topics: string[];
}

export const demoExams: DemoExam[] = [
  { courseCode: "MATH 2210", title: "Quiz 2 — Eigenvalues & Diagonalisation", kind: "quiz", dayOffset: 5, start_time: "09:00", end_time: "09:45", location: "Noether 118", weight: 10, preparation: 45, topics: ["Characteristic polynomials", "Diagonalisation", "Similar matrices"] },
  { courseCode: "CS 3410", title: "Algorithms Midterm", kind: "midterm", dayOffset: 9, start_time: "09:00", end_time: "11:00", location: "Great Hall", weight: 25, preparation: 32, topics: ["Amortised analysis", "Balanced trees", "Shortest paths", "Greedy proofs"] },
  { courseCode: "PHYS 1120", title: "Lab Practical Assessment", kind: "practical", dayOffset: 16, start_time: "14:00", end_time: "16:00", location: "Faraday Lab 2", weight: 15, preparation: 18, topics: ["Induction", "Oscilloscope technique", "Uncertainty analysis"] },
  { courseCode: "CS 3200", title: "Database Systems Midterm", kind: "midterm", dayOffset: 23, start_time: "13:00", end_time: "15:00", location: "Codd Lecture 1", weight: 25, preparation: 12, topics: ["Relational algebra", "Normalisation", "Query planning", "Transactions"] },
];

export interface DemoNote {
  courseCode: string;
  title: string;
  content: string;
  tags: string[];
  is_pinned: boolean;
}

export const demoNotes: DemoNote[] = [
  { courseCode: "CS 3410", title: "Amortised analysis — three methods", content: "Aggregate, accounting and potential methods compared on the dynamic array. The potential function Φ = 2n − size is the one worth memorising.", tags: ["midterm", "proofs"], is_pinned: true },
  { courseCode: "CS 3200", title: "Normalisation worked examples", content: "1NF → BCNF on the campus events schema, including the functional dependency closure and why the venue table has to split.", tags: ["assignment", "schema"], is_pinned: true },
  { courseCode: "PHYS 1120", title: "Faraday's law — lab prep", content: "Flux rules, Lenz sign conventions, and the oscilloscope settings that actually worked last week for experiment 4.", tags: ["lab", "experiment-4"], is_pinned: false },
  { courseCode: "MATH 2210", title: "Eigenvalue recipes", content: "Characteristic polynomial → eigenvalues → eigenspaces → diagonalisation, with the 3×3 defective case that came up in the tutorial.", tags: ["quiz-2"], is_pinned: false },
  { courseCode: "ENG 2150", title: "Design document structure", content: "Context, goals, non-goals, alternatives considered, rollout. Cho's rule: the non-goals section is what stops scope creep.", tags: ["draft"], is_pinned: false },
  { courseCode: "CS 3410", title: "Graph algorithms cheat sheet", content: "Dijkstra, Bellman–Ford and Floyd–Warshall side by side: complexity, negative-weight handling and when each is the right call.", tags: ["midterm", "cheat-sheet"], is_pinned: false },
];

export interface DemoEvent {
  courseCode: string;
  title: string;
  kind: SessionKind;
  /** 1 = Monday … 5 = Friday. Expanded across the seeded weeks. */
  weekday: number;
  start_time: string;
  end_time: string;
  location: string;
}

export const demoWeeklyEvents: DemoEvent[] = [
  { courseCode: "CS 3410", title: "Algorithms Lecture", kind: "lecture", weekday: 1, start_time: "09:00", end_time: "10:30", location: "Turing Hall 204" },
  { courseCode: "MATH 2210", title: "Linear Algebra Lecture", kind: "lecture", weekday: 1, start_time: "11:00", end_time: "12:15", location: "Noether 118" },
  { courseCode: "CS 3200", title: "Database Lab", kind: "lab", weekday: 1, start_time: "14:00", end_time: "16:00", location: "Codd Lab 3" },
  { courseCode: "PHYS 1120", title: "Electromagnetism Lecture", kind: "lecture", weekday: 2, start_time: "09:30", end_time: "11:00", location: "Faraday Theatre A" },
  { courseCode: "ENG 2150", title: "Technical Writing Seminar", kind: "seminar", weekday: 2, start_time: "13:00", end_time: "14:30", location: "Seminar Room 12" },
  { courseCode: "CS 3410", title: "Algorithms Lecture", kind: "lecture", weekday: 3, start_time: "09:00", end_time: "10:30", location: "Turing Hall 204" },
  { courseCode: "CS 3200", title: "Database Systems Lecture", kind: "lecture", weekday: 3, start_time: "11:00", end_time: "12:15", location: "Codd Lecture 1" },
  { courseCode: "PHYS 1120", title: "Physics Lab", kind: "lab", weekday: 3, start_time: "14:00", end_time: "16:30", location: "Faraday Lab 2" },
  { courseCode: "MATH 2210", title: "Linear Algebra Lecture", kind: "lecture", weekday: 4, start_time: "09:00", end_time: "10:15", location: "Noether 118" },
  { courseCode: "ENG 2150", title: "Writing Workshop", kind: "seminar", weekday: 4, start_time: "14:00", end_time: "15:30", location: "Seminar Room 12" },
  { courseCode: "CS 3200", title: "Database Systems Lecture", kind: "lecture", weekday: 5, start_time: "09:00", end_time: "10:15", location: "Codd Lecture 1" },
  { courseCode: "CS 3410", title: "Algorithms Study Group", kind: "study", weekday: 5, start_time: "13:00", end_time: "15:00", location: "Library, Group Room B" },
];

/** Relative weight of study time per course, used to shape seeded sessions. */
export const demoCourseWeights: Record<string, number> = {
  "CS 3410": 0.28,
  "CS 3200": 0.22,
  "MATH 2210": 0.2,
  "PHYS 1120": 0.2,
  "ENG 2150": 0.1,
};
