"use client";

import { Button, Card, Chip, ProgressBar } from "@heroui/react";
import { GraduationCap, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { CourseDot } from "@/components/ui/course-dot";
import { ErrorState, ListSkeleton, LoadingRegion, NoData } from "@/components/ui/data-states";
import { ConfirmDeleteDialog } from "@/components/ui/form-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { listCourses } from "@/features/courses/api";
import { deleteExam, listExams } from "@/features/exams/api";
import { ExamFormDialog } from "@/features/exams/exam-form";
import { useMutation } from "@/features/shared/use-mutation";
import { useQuery } from "@/features/shared/use-query";
import type { Exam } from "@/lib/supabase/database.types";
import { daysUntil, formatLongDate, formatTime, todayIso } from "@/lib/date";

export default function ExamsPage() {
  const load = useCallback(async () => {
    const [exams, courses] = await Promise.all([listExams(), listCourses()]);
    return { exams, courses };
  }, []);

  const { data, error, isLoading, refetch } = useQuery(load, []);
  const [editing, setEditing] = useState<Exam | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Exam | undefined>(undefined);

  const remove = useMutation(async (id: string) => deleteExam(id), {
    successMessage: "Exam deleted.",
    errorMessage: "Couldn't delete the exam",
    onSuccess: () => {
      setPendingDelete(undefined);
      void refetch();
    },
  });

  const today = todayIso();
  const exams = data?.exams ?? [];
  const courses = data?.courses ?? [];
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const upcoming = exams.filter((exam) => exam.exam_date >= today);
  const past = exams.filter((exam) => exam.exam_date < today);

  const openForm = (exam?: Exam) => {
    setEditing(exam);
    setIsFormOpen(true);
  };

  const renderExam = (exam: Exam, isPast: boolean) => {
    const course = exam.course_id ? courseById.get(exam.course_id) : undefined;
    const days = daysUntil(exam.exam_date);

    return (
      <Card key={exam.id} className={`gap-3 border border-border p-5 ${isPast ? "opacity-60" : ""}`}>
        <Card.Header className="flex-row items-start justify-between gap-3">
          <div className="min-w-0">
            <Card.Title className="text-base font-semibold text-balance">{exam.title}</Card.Title>
            <Card.Description className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              {course ? (
                <span className="inline-flex items-center gap-1.5">
                  <CourseDot course={course} />
                  {course.code}
                </span>
              ) : null}
              <span>{formatLongDate(exam.exam_date)}</span>
              {exam.start_time && exam.end_time ? (
                <span>
                  {formatTime(exam.start_time)}–{formatTime(exam.end_time)}
                </span>
              ) : null}
            </Card.Description>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {!isPast ? (
              <Chip color={days <= 3 ? "danger" : days <= 7 ? "warning" : "default"} size="sm" variant="soft">
                {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days} days`}
              </Chip>
            ) : null}
            <Button aria-label={`Edit ${exam.title}`} isIconOnly onPress={() => openForm(exam)} size="sm" variant="ghost">
              <Pencil aria-hidden="true" className="size-4" strokeWidth={1.85} />
            </Button>
            <Button
              aria-label={`Delete ${exam.title}`}
              isIconOnly
              onPress={() => setPendingDelete(exam)}
              size="sm"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.85} />
            </Button>
          </div>
        </Card.Header>

        <Card.Content className="gap-3">
          {exam.location || exam.weight ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              {exam.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin aria-hidden="true" className="size-3" strokeWidth={1.85} />
                  {exam.location}
                </span>
              ) : null}
              {exam.location && exam.weight ? <span aria-hidden="true">·</span> : null}
              {exam.weight ? <span>{exam.weight}% of the final grade</span> : null}
            </p>
          ) : null}

          {!isPast ? (
            <ProgressBar
              aria-label={`Revision for ${exam.title}`}
              color={exam.preparation < 40 ? "warning" : "accent"}
              size="sm"
              value={exam.preparation}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-foreground">Revision</span>
                <ProgressBar.Output className="tabular text-xs text-muted" />
              </div>
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          ) : null}

          {exam.topics.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {exam.topics.map((topic) => (
                <Chip key={topic} size="sm" variant="soft">
                  {topic}
                </Chip>
              ))}
            </div>
          ) : null}

          {exam.notes ? <p className="text-sm text-muted">{exam.notes}</p> : null}
        </Card.Content>
      </Card>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader
        actions={
          <Button onPress={() => openForm()} size="sm" variant="primary">
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
            Add exam
          </Button>
        }
        description={
          exams.length === 0 ? "Assessment dates and revision progress." : `${upcoming.length} upcoming`
        }
        title="Exams"
      />

      {isLoading ? (
        <>
          <LoadingRegion label="Loading exams" />
          <ListSkeleton rows={3} />
        </>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load your exams" />
      ) : exams.length === 0 ? (
        <Card className="border border-border p-8">
          <NoData
            action={
              <Button onPress={() => openForm()} size="sm" variant="primary">
                <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
                Add your first exam
              </Button>
            }
            description="Add assessments to see countdowns and track revision."
            icon={<GraduationCap aria-hidden="true" className="size-5" strokeWidth={1.75} />}
            title="No exams yet"
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            {upcoming.map((exam) => renderExam(exam, false))}
          </div>

          {past.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted">Past</h2>
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                {past.map((exam) => renderExam(exam, true))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      {isFormOpen ? (
        <ExamFormDialog
          key={`${editing?.id ?? 'new'}`}
          courses={courses}
          exam={editing}
          isOpen={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSaved={refetch}
        />
      ) : null}

      <ConfirmDeleteDialog
        description={pendingDelete ? `"${pendingDelete.title}" will be permanently deleted.` : ""}
        isOpen={Boolean(pendingDelete)}
        isPending={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) void remove.mutate(pendingDelete.id);
        }}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(undefined);
        }}
        title="Delete this exam?"
      />
    </div>
  );
}
