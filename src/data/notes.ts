import type { Note } from "@/types";

/** Lecture notebooks and revision summaries, newest first. */
export const notes: Note[] = [
  {
    id: "note-1",
    courseId: "cs-3410",
    title: "Amortised analysis — three methods",
    excerpt:
      "Aggregate, accounting and potential methods compared on the dynamic array. The potential function Φ = 2n − size is the one worth memorising.",
    updated: "2026-09-16",
    wordCount: 940,
    tags: ["midterm", "proofs"],
    isPinned: true,
  },
  {
    id: "note-2",
    courseId: "cs-3200",
    title: "Normalisation worked examples",
    excerpt:
      "1NF → BCNF on the campus events schema, including the functional dependency closure and why the venue table has to split.",
    updated: "2026-09-16",
    wordCount: 1_280,
    tags: ["assignment", "schema"],
    isPinned: true,
  },
  {
    id: "note-3",
    courseId: "phys-1120",
    title: "Faraday's law — lab prep",
    excerpt:
      "Flux rules, Lenz sign conventions, and the oscilloscope settings that actually worked last week for experiment 4.",
    updated: "2026-09-15",
    wordCount: 620,
    tags: ["lab", "experiment-4"],
    isPinned: false,
  },
  {
    id: "note-4",
    courseId: "math-2210",
    title: "Eigenvalue recipes",
    excerpt:
      "Characteristic polynomial → eigenvalues → eigenspaces → diagonalisation, with the 3×3 defective case that came up in the tutorial.",
    updated: "2026-09-15",
    wordCount: 780,
    tags: ["quiz-2"],
    isPinned: false,
  },
  {
    id: "note-5",
    courseId: "eng-2150",
    title: "Design document structure",
    excerpt:
      "Context, goals, non-goals, alternatives considered, rollout. Cho's rule: the non-goals section is what stops scope creep.",
    updated: "2026-09-14",
    wordCount: 410,
    tags: ["draft"],
    isPinned: false,
  },
  {
    id: "note-6",
    courseId: "cs-3410",
    title: "Graph algorithms cheat sheet",
    excerpt:
      "Dijkstra, Bellman–Ford and Floyd–Warshall side by side: complexity, negative-weight handling and when each is the right call.",
    updated: "2026-09-12",
    wordCount: 1_050,
    tags: ["midterm", "cheat-sheet"],
    isPinned: false,
  },
];

/** Notes touched on or after `date`, newest first. */
export function recentNotes(limit = 4): Note[] {
  return [...notes]
    .sort((a, b) => b.updated.localeCompare(a.updated) || Number(b.isPinned) - Number(a.isPinned))
    .slice(0, limit);
}
