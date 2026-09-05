"use client";

import { Button, Card, Chip, ProgressBar } from "@heroui/react";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { CourseDot } from "@/components/ui/course-dot";
import { ErrorState, ListSkeleton, LoadingRegion, NoData } from "@/components/ui/data-states";
import { ConfirmDeleteDialog } from "@/components/ui/form-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { deleteCourse, listCourses, type CourseWithProgress } from "@/features/courses/api";
import { CourseFormDialog } from "@/features/courses/course-form";
import { CourseTopics } from "@/features/courses/course-topics";
import { useMutation } from "@/features/shared/use-mutation";
import { useQuery } from "@/features/shared/use-query";
import { toLetterGrade } from "@/lib/format";

export default function CoursesPage() {
  const { data, error, isLoading, refetch } = useQuery(listCourses, []);
  const [editing, setEditing] = useState<CourseWithProgress | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CourseWithProgress | undefined>(undefined);

  const remove = useMutation(async (id: string) => deleteCourse(id), {
    successMessage: "Course deleted.",
    errorMessage: "Couldn't delete the course",
    onSuccess: () => {
      setPendingDelete(undefined);
      void refetch();
    },
  });

  const courses = data ?? [];
  const totalCredits = courses.reduce((sum, course) => sum + (course.credits ?? 0), 0);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader
        actions={
          <Button
            onPress={() => {
              setEditing(undefined);
              setIsFormOpen(true);
            }}
            size="sm"
            variant="primary"
          >
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
            Add course
          </Button>
        }
        description={
          courses.length === 0
            ? "The courses you're taking this term."
            : `${courses.length} courses · ${totalCredits} credits`
        }
        title="Courses"
      />

      {isLoading ? (
        <>
          <LoadingRegion label="Loading courses" />
          <ListSkeleton rows={4} />
        </>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load your courses" />
      ) : courses.length === 0 ? (
        <Card className="border border-border p-8">
          <NoData
            action={
              <Button
                onPress={() => {
                  setEditing(undefined);
                  setIsFormOpen(true);
                }}
                size="sm"
                variant="primary"
              >
                <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
                Add your first course
              </Button>
            }
            description="Add a course to track its topics, grade and study time."
            icon={<BookOpen aria-hidden="true" className="size-5" strokeWidth={1.75} />}
            title="No courses yet"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {courses.map((course) => (
            <Card key={course.id} className="gap-4 border border-border p-5">
              <Card.Header className="flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <CourseDot course={course} />
                    <Card.Title className="text-base font-semibold">{course.code}</Card.Title>
                    {course.grade !== null ? (
                      <Chip size="sm" variant="soft">
                        {toLetterGrade(course.grade)} · {course.grade}%
                      </Chip>
                    ) : null}
                  </div>
                  <Card.Description className="mt-1">{course.title}</Card.Description>
                </div>

                <div className="flex shrink-0 gap-1">
                  <Button
                    aria-label={`Edit ${course.code}`}
                    isIconOnly
                    onPress={() => {
                      setEditing(course);
                      setIsFormOpen(true);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    <Pencil aria-hidden="true" className="size-4" strokeWidth={1.85} />
                  </Button>
                  <Button
                    aria-label={`Delete ${course.code}`}
                    isIconOnly
                    onPress={() => setPendingDelete(course)}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.85} />
                  </Button>
                </div>
              </Card.Header>

              <Card.Content className="gap-3">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  {course.instructor ? <span>{course.instructor}</span> : null}
                  {course.instructor && course.credits ? <span aria-hidden="true">·</span> : null}
                  {course.credits ? <span>{course.credits} credits</span> : null}
                  {course.location ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{course.location}</span>
                    </>
                  ) : null}
                </p>

                {course.summary ? <p className="text-sm text-muted">{course.summary}</p> : null}

                <ProgressBar
                  aria-label={`${course.title}: ${course.progress}% of topics complete`}
                  size="sm"
                  value={course.progress}
                >
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">Topics</span>
                    <span className="tabular text-xs text-muted">
                      {course.topics_complete}/{course.topic_count} · {course.progress}%
                    </span>
                  </div>
                  <ProgressBar.Track>
                    <ProgressBar.Fill />
                  </ProgressBar.Track>
                </ProgressBar>

                <CourseTopics courseId={course.id} onChanged={refetch} />
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      {isFormOpen ? (
        <CourseFormDialog
          key={`${editing?.id ?? 'new'}`}
          course={editing}
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSaved={refetch}
        />
      ) : null}

      <ConfirmDeleteDialog
        description={
          pendingDelete
            ? `"${pendingDelete.code} — ${pendingDelete.title}" and its topics and lectures will be deleted. Tasks, exams and notes stay, but lose their course link.`
            : ""
        }
        isOpen={Boolean(pendingDelete)}
        isPending={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) void remove.mutate(pendingDelete.id);
        }}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(undefined);
        }}
        title="Delete this course?"
      />
    </div>
  );
}
