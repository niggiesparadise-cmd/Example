/**
 * The dashboard's data layer.
 *
 * UI components import from here only — swapping these mock modules for API
 * calls later means changing this folder, not the components.
 */
export { student } from "./student";
export { courses, courseOf } from "./courses";
export { scheduleEvents, eventsOn, eventsBetween, term } from "./schedule";
export { tasks, openTasks, tasksDueBetween } from "./tasks";
export { exams, upcomingExams } from "./exams";
export { notes, recentNotes } from "./notes";
export { studySessions } from "./study-sessions";
export {
  averageFocus,
  dailyStudy,
  recentDailyStudy,
  studyByCourse,
  studyMinutesBetween,
  studyStreak,
  weekOverWeekStudy,
  type CourseStudyTotal,
  type DailyStudyPoint,
} from "./analytics";
