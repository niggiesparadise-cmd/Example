import {
  BookOpen,
  CalendarDays,
  ChartNoAxesColumn,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  NotebookPen,
  type LucideIcon,
} from "lucide-react";
import { exams } from "@/data/exams";
import { tasks } from "@/data/tasks";
import { TODAY, addDays } from "@/lib/date";

export interface NavItem {
  /** Route the item links to. */
  href: string;
  label: string;
  /** Two-word description used by the mobile drawer and tooltips. */
  description: string;
  icon: LucideIcon;
  /** Shown as a count badge in the sidebar when greater than zero. */
  badge?: number;
  /** Whether the item appears in the mobile bottom bar. */
  primary?: boolean;
}

/** Open tasks falling due in the next week — the Tasks badge. */
const tasksNeedingAttention = tasks.filter(
  (task) => task.status !== "done" && task.due <= addDays(TODAY, 7),
).length;

/** Assessments in the next fortnight — the Exams badge. */
const examsSoon = exams.filter((exam) => exam.date >= TODAY && exam.date <= addDays(TODAY, 14)).length;

/** Single source of truth for every section of the dashboard. */
export const navigation: NavItem[] = [
  {
    href: "/",
    label: "Overview",
    description: "Today at a glance",
    icon: LayoutDashboard,
    primary: true,
  },
  {
    href: "/courses",
    label: "Courses",
    description: "Enrolled this term",
    icon: BookOpen,
  },
  {
    href: "/schedule",
    label: "Schedule",
    description: "Lectures and labs",
    icon: CalendarDays,
    primary: true,
  },
  {
    href: "/tasks",
    label: "Tasks",
    description: "Assignments and reading",
    icon: ListChecks,
    badge: tasksNeedingAttention,
    primary: true,
  },
  {
    href: "/exams",
    label: "Exams",
    description: "Dates and revision",
    icon: GraduationCap,
    badge: examsSoon,
    primary: true,
  },
  {
    href: "/notes",
    label: "Notes",
    description: "Lecture notebooks",
    icon: NotebookPen,
  },
  {
    href: "/analytics",
    label: "Analytics",
    description: "Study patterns",
    icon: ChartNoAxesColumn,
  },
];

/** Items pinned to the mobile bottom bar; the rest live behind “More”. */
export const primaryNavigation = navigation.filter((item) => item.primary);

/** Items that only appear in the mobile “More” drawer. */
export const secondaryNavigation = navigation.filter((item) => !item.primary);
