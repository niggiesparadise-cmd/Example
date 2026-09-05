import type { Course } from "@/types";

/**
 * Courses the student is enrolled in this term.
 *
 * `colorSlot` fixes each course's identity colour: it follows the course, never
 * its position in a filtered or sorted list, so a reader who learns "Databases
 * is teal" is never misled.
 */
export const courses: Course[] = [
  {
    id: "cs-3410",
    code: "CS 3410",
    title: "Data Structures & Algorithms",
    instructor: "Prof. Elena Márquez",
    credits: 4,
    location: "Turing Hall 204",
    colorSlot: 1,
    progress: 34,
    grade: 91,
    letterGrade: "A−",
    attendance: 100,
    hoursStudied: 41.5,
    summary: "Amortised analysis, balanced trees, graph algorithms and NP-completeness.",
  },
  {
    id: "math-2210",
    code: "MATH 2210",
    title: "Linear Algebra",
    instructor: "Dr. Samuel Whitfield",
    credits: 3,
    location: "Noether Building 118",
    colorSlot: 2,
    progress: 28,
    grade: 87,
    letterGrade: "B+",
    attendance: 92,
    hoursStudied: 28.0,
    summary: "Vector spaces, eigendecomposition, orthogonality and the SVD.",
  },
  {
    id: "cs-3200",
    code: "CS 3200",
    title: "Database Systems",
    instructor: "Prof. Nadia Haddad",
    credits: 3,
    location: "Codd Lab 3",
    colorSlot: 3,
    progress: 41,
    grade: 94,
    letterGrade: "A",
    attendance: 96,
    hoursStudied: 33.5,
    summary: "Relational design, query planning, transactions and distributed storage.",
  },
  {
    id: "phys-1120",
    code: "PHYS 1120",
    title: "Electromagnetism",
    instructor: "Dr. Ingrid Sørensen",
    credits: 4,
    location: "Faraday Theatre A",
    colorSlot: 4,
    progress: 22,
    grade: 83,
    letterGrade: "B",
    attendance: 88,
    hoursStudied: 24.0,
    summary: "Electrostatics, magnetic fields, induction and Maxwell's equations.",
  },
  {
    id: "eng-2150",
    code: "ENG 2150",
    title: "Technical Writing",
    instructor: "Prof. Daniel Cho",
    credits: 2,
    location: "Seminar Room 12",
    colorSlot: 5,
    progress: 45,
    grade: 92,
    letterGrade: "A−",
    attendance: 100,
    hoursStudied: 12.5,
    summary: "Specifications, design documents and writing for technical audiences.",
  },
];

const byId = new Map(courses.map((course) => [course.id, course]));

/**
 * Look up a course by id, falling back to a neutral placeholder so a stray id
 * in the data never crashes a list.
 */
export function courseOf(id: string): Course {
  return byId.get(id) ?? placeholderCourse;
}

const placeholderCourse: Course = {
  id: "unknown",
  code: "—",
  title: "Unassigned",
  instructor: "—",
  credits: 0,
  location: "—",
  colorSlot: 1,
  progress: 0,
  grade: 0,
  letterGrade: "—",
  attendance: 0,
  hoursStudied: 0,
  summary: "",
};
