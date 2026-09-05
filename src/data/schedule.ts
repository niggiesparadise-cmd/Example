import type { ScheduleEvent, SessionKind, Weekday } from "@/types";
import { addDays, weekdayOf } from "@/lib/date";

/** Term boundaries for Autumn 2026 — teaching weeks 1–14. */
export const term = {
  start: "2026-08-31",
  end: "2026-12-04",
} as const;

interface RecurringSlot {
  courseId: string;
  title: string;
  kind: SessionKind;
  weekday: Weekday;
  start: string;
  end: string;
  location: string;
  note?: string;
}

/** The repeating weekly timetable the term is built from. */
const weeklyTimetable: RecurringSlot[] = [
  // Monday
  { courseId: "cs-3410", title: "Algorithms Lecture", kind: "lecture", weekday: 1, start: "09:00", end: "10:30", location: "Turing Hall 204" },
  { courseId: "math-2210", title: "Linear Algebra Lecture", kind: "lecture", weekday: 1, start: "11:00", end: "12:15", location: "Noether 118" },
  { courseId: "cs-3200", title: "Database Lab", kind: "lab", weekday: 1, start: "14:00", end: "16:00", location: "Codd Lab 3", note: "Bring your query plans" },
  // Tuesday
  { courseId: "phys-1120", title: "Electromagnetism Lecture", kind: "lecture", weekday: 2, start: "09:30", end: "11:00", location: "Faraday Theatre A" },
  { courseId: "eng-2150", title: "Technical Writing Seminar", kind: "seminar", weekday: 2, start: "13:00", end: "14:30", location: "Seminar Room 12" },
  { courseId: "cs-3410", title: "Algorithms Tutorial", kind: "tutorial", weekday: 2, start: "16:00", end: "17:00", location: "Turing Hall 110" },
  // Wednesday
  { courseId: "cs-3410", title: "Algorithms Lecture", kind: "lecture", weekday: 3, start: "09:00", end: "10:30", location: "Turing Hall 204" },
  { courseId: "cs-3200", title: "Database Systems Lecture", kind: "lecture", weekday: 3, start: "11:00", end: "12:15", location: "Codd Lecture 1" },
  { courseId: "phys-1120", title: "Physics Lab", kind: "lab", weekday: 3, start: "14:00", end: "16:30", location: "Faraday Lab 2", note: "Experiment 4 — induction" },
  { courseId: "math-2210", title: "Problem Set Study Block", kind: "study", weekday: 3, start: "19:00", end: "20:30", location: "Library, Level 4" },
  // Thursday
  { courseId: "math-2210", title: "Linear Algebra Lecture", kind: "lecture", weekday: 4, start: "09:00", end: "10:15", location: "Noether 118" },
  { courseId: "math-2210", title: "Linear Algebra Tutorial", kind: "tutorial", weekday: 4, start: "10:30", end: "11:30", location: "Noether 006" },
  { courseId: "eng-2150", title: "Writing Workshop", kind: "seminar", weekday: 4, start: "14:00", end: "15:30", location: "Seminar Room 12" },
  // Friday
  { courseId: "cs-3200", title: "Database Systems Lecture", kind: "lecture", weekday: 5, start: "09:00", end: "10:15", location: "Codd Lecture 1" },
  { courseId: "phys-1120", title: "Physics Tutorial", kind: "tutorial", weekday: 5, start: "11:00", end: "12:00", location: "Faraday 210" },
  { courseId: "cs-3410", title: "Algorithms Study Group", kind: "study", weekday: 5, start: "13:00", end: "15:00", location: "Library, Group Room B" },
];

/** One-off sessions layered on top of the repeating timetable. */
const oneOffEvents: ScheduleEvent[] = [
  {
    id: "evt-guest-lecture",
    courseId: "cs-3200",
    title: "Guest Lecture — Distributed Storage at Scale",
    kind: "seminar",
    date: "2026-09-17",
    start: "17:00",
    end: "18:30",
    location: "Codd Lecture 1",
    note: "Optional, counts toward seminar credit",
  },
  {
    id: "evt-writing-clinic",
    courseId: "eng-2150",
    title: "One-to-one Writing Clinic",
    kind: "tutorial",
    date: "2026-09-18",
    start: "15:45",
    end: "16:15",
    location: "Seminar Room 4",
    note: "Draft of the design document",
  },
  {
    id: "evt-midterm-cs3410",
    courseId: "cs-3410",
    title: "Algorithms Midterm",
    kind: "exam",
    date: "2026-09-25",
    start: "09:00",
    end: "11:00",
    location: "Great Hall",
  },
  {
    id: "evt-quiz-math",
    courseId: "math-2210",
    title: "Linear Algebra Quiz 2",
    kind: "exam",
    date: "2026-09-21",
    start: "09:00",
    end: "09:45",
    location: "Noether 118",
  },
  {
    id: "evt-practical-phys",
    courseId: "phys-1120",
    title: "Lab Practical Assessment",
    kind: "exam",
    date: "2026-10-02",
    start: "14:00",
    end: "16:00",
    location: "Faraday Lab 2",
  },
];

function expandTimetable(): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  const last = new Date(`${term.end}T00:00:00Z`);

  for (let date: string = term.start; new Date(`${date}T00:00:00Z`) <= last; date = addDays(date, 1)) {
    const weekday = weekdayOf(date);
    for (const slot of weeklyTimetable) {
      if (slot.weekday !== weekday) continue;
      events.push({
        id: `${slot.courseId}-${slot.kind}-${date}-${slot.start.replace(":", "")}`,
        courseId: slot.courseId,
        title: slot.title,
        kind: slot.kind,
        date,
        start: slot.start,
        end: slot.end,
        location: slot.location,
        note: slot.note,
      });
    }
  }
  return events;
}

/** Every timetabled session of the term, sorted by date then start time. */
export const scheduleEvents: ScheduleEvent[] = [...expandTimetable(), ...oneOffEvents].sort(
  (a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
);

/** Sessions on a single day. */
export function eventsOn(date: string): ScheduleEvent[] {
  return scheduleEvents.filter((event) => event.date === date);
}

/** Sessions between two ISO dates, inclusive. */
export function eventsBetween(from: string, to: string): ScheduleEvent[] {
  return scheduleEvents.filter((event) => event.date >= from && event.date <= to);
}
