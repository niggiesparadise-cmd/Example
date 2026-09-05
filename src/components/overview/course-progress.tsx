import { ProgressBar } from "@heroui/react";
import { BookOpen } from "lucide-react";
import { CardLink } from "@/components/ui/card-link";
import { CourseDot } from "@/components/ui/course-dot";
import { SectionCard } from "@/components/ui/section-card";
import { courses } from "@/data";
import { formatNumber } from "@/lib/format";

/** Syllabus progress and running grade for every enrolled course. */
export function CourseProgress() {
  const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);

  return (
    <SectionCard
      action={<CardLink href="/courses">All courses</CardLink>}
      description={`${courses.length} courses · ${formatNumber(totalCredits)} credits this term`}
      icon={<BookOpen aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
      title="Course progress"
    >
      <ul className="flex flex-col gap-4">
        {courses.map((course) => (
          <li key={course.id}>
            <ProgressBar
              aria-label={`${course.title}: ${course.progress}% of the syllabus covered`}
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
                  <span className="tabular text-xs text-muted">{course.progress}%</span>
                  <span className="tabular text-xs font-medium text-foreground">{course.letterGrade}</span>
                </span>
              </div>
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
