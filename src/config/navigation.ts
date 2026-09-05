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

export interface NavItem {
  /** Route the item links to. */
  href: string;
  label: string;
  /** Two-word description used by the mobile drawer and tooltips. */
  description: string;
  icon: LucideIcon;
  /**
   * Key the live badge count is looked up under. The count itself comes from
   * the user's data at render time, not from this static config.
   */
  badgeKey?: "tasks" | "exams";
  /** Whether the item appears in the mobile bottom bar. */
  primary?: boolean;
}

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
    badgeKey: "tasks",
    primary: true,
  },
  {
    href: "/exams",
    label: "Exams",
    description: "Dates and revision",
    icon: GraduationCap,
    badgeKey: "exams",
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
