import { cn } from "@heroui/react";
import type { Course } from "@/types";
import { courseDotClass } from "@/lib/chart-palette";

/**
 * A course's identity colour as a small dot.
 *
 * The dot is decorative — the course code always sits beside it — so colour is
 * never the only way to tell two courses apart.
 */
export function CourseDot({ className, course }: { className?: string; course: Course }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2.5 shrink-0 rounded-full", courseDotClass[course.colorSlot], className)}
    />
  );
}

/** The dot plus the course code, the standard way a course is labelled inline. */
export function CourseTag({ className, course }: { className?: string; course: Course }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-muted", className)}>
      <CourseDot course={course} />
      {course.code}
    </span>
  );
}
