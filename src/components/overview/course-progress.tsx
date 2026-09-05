"use client";

import { ProgressBar } from "@heroui/react";
import { BookOpen } from "lucide-react";
import { CardLink } from "@/components/ui/card-link";
import { CourseDot } from "@/components/ui/course-dot";
import { NoData } from "@/components/ui/data-states";
import { SectionCard } from "@/components/ui/section-card";
import type { CourseWithProgress } from "@/features/courses/api";
import { toLetterGrade } from "@/lib/format";

/**
 * Syllabus progress per course.
 *
 * Progress is derived from completed topics rather than stored as a number, so
 * it cannot drift from what the course actually contains.
 */
export function CourseProgress({ courses }: { courses: CourseWithProgress[] }) {
  const totalCredits = courses.reduce((sum, course) => sum + (course.credits ?? 0), 0);

  return (
    <SectionCard
      action={<CardLink href="/courses/">All courses</CardLink>}
      description={
        courses.length === 0
          ? "No courses yet"
          : `${courses.length} courses · ${totalCredits} credits this term`
      }
      icon={<BookOpen aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
      title="Course progress"
    >
      {courses.length === 0 ? (
        <NoData
          action={<CardLink href="/courses/">Add a course</CardLink>}
          description="Add the courses you're taking to track progress and grades."
          icon={<BookOpen aria-hidden="true" className="size-5" strokeWidth={1.75} />}
          title="No courses yet"
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {courses.map((course) => (
            <li key={course.id}>
              <ProgressBar
                aria-label={`${course.title}: ${course.progress}% of topics complete`}
                size="sm"
                value={course.progress}
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <CourseDot course={course} />
                    <span className="truncate text-sm font-medium text-foreground">{course.code}</span>
                    <span className="truncate text-xs text-muted max-sm:hidden">{course.title}</span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <span className="tabular text-xs text-muted">
                      {course.topic_count === 0 ? "No topics" : `${course.progress}%`}
                    </span>
                    {course.grade !== null ? (
                      <span className="tabular text-xs font-medium text-foreground">
                        {toLetterGrade(course.grade)}
                      </span>
                    ) : null}
                  </span>
                </div>
                <ProgressBar.Track>
                  <ProgressBar.Fill />
                </ProgressBar.Track>
              </ProgressBar>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
