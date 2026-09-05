import type { StudySession } from "@/types";
import { TODAY, addDays, weekdayOf } from "@/lib/date";
import { courses } from "./courses";

/**
 * Logged study blocks for the last ten weeks.
 *
 * The sessions are generated from a fixed seed rather than written out by hand:
 * the shape stays realistic (lighter weekends, heavier run-ups to deadlines)
 * while the output is byte-for-byte identical on the server and in the browser,
 * so nothing shifts under hydration.
 */

/** Number of days of history the generator produces, ending on {@link TODAY}. */
const HISTORY_DAYS = 70;

/** Deterministic PRNG — same seed, same sequence, every render. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** How much of a typical day each weekday carries — Sunday first. */
const weekdayLoad = [0.55, 1, 1, 1.05, 0.95, 0.8, 0.4];

/** Relative share of study time each course attracts. */
const courseWeights: Record<string, number> = {
  "cs-3410": 0.28,
  "cs-3200": 0.22,
  "math-2210": 0.2,
  "phys-1120": 0.2,
  "eng-2150": 0.1,
};

function generateSessions(): StudySession[] {
  const random = mulberry32(20_260_916);
  const sessions: StudySession[] = [];
  const firstDay = addDays(TODAY, -(HISTORY_DAYS - 1));

  for (let dayIndex = 0; dayIndex < HISTORY_DAYS; dayIndex += 1) {
    const date = addDays(firstDay, dayIndex);
    // Study time creeps up as the term gets going and midterms approach.
    const termRamp = 0.82 + 0.35 * (dayIndex / HISTORY_DAYS);
    const dayTotal = 190 * weekdayLoad[weekdayOf(date)] * termRamp * (0.75 + 0.5 * random());

    for (const course of courses) {
      const share = courseWeights[course.id] ?? 0.1;
      const minutes = Math.round((dayTotal * share * (0.55 + 0.9 * random())) / 15) * 15;
      if (minutes < 30) continue;

      sessions.push({
        id: `${course.id}-${date}`,
        courseId: course.id,
        date,
        minutes,
        focus: Math.round(62 + 30 * random()),
      });
    }
  }

  return sessions;
}

export const studySessions: StudySession[] = generateSessions();
