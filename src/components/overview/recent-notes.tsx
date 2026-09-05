"use client";

import { Chip } from "@heroui/react";
import { NotebookPen, Pin } from "lucide-react";
import { CardLink } from "@/components/ui/card-link";
import { CourseDot } from "@/components/ui/course-dot";
import { NoData } from "@/components/ui/data-states";
import { SectionCard } from "@/components/ui/section-card";
import type { Course, Note } from "@/lib/supabase/database.types";
import { relativeDayLabel } from "@/lib/date";
import { formatNumber } from "@/lib/format";

/** The notebooks touched most recently. */
export function RecentNotes({ courses, notes }: { courses: Course[]; notes: Note[] }) {
  const recent = notes.slice(0, 4);
  const courseById = new Map(courses.map((course) => [course.id, course]));

  return (
    <SectionCard
      action={<CardLink href="/notes/">All notes</CardLink>}
      description={notes.length === 0 ? "No notes yet" : "Picking up where you left off"}
      icon={<NotebookPen aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
      title="Recent notes"
    >
      {recent.length === 0 ? (
        <NoData
          action={<CardLink href="/notes/">Write a note</CardLink>}
          description="Lecture notes and revision summaries live here."
          icon={<NotebookPen aria-hidden="true" className="size-5" strokeWidth={1.75} />}
          title="No notes yet"
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {recent.map((note) => {
            const course = note.course_id ? courseById.get(note.course_id) : undefined;
            const words = note.content.trim() ? note.content.trim().split(/\s+/).length : 0;

            return (
              <li key={note.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-balance text-foreground">{note.title}</p>
                  {note.is_pinned ? (
                    <Pin aria-label="Pinned" className="size-3.5 shrink-0 text-muted" strokeWidth={1.85} />
                  ) : null}
                </div>

                {note.content ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{note.content}</p>
                ) : null}

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  {course ? (
                    <>
                      <span className="inline-flex items-center gap-1.5">
                        <CourseDot course={course} />
                        {course.code}
                      </span>
                      <span aria-hidden="true">·</span>
                    </>
                  ) : null}
                  <span>{relativeDayLabel(note.updated_at.slice(0, 10))}</span>
                  {words > 0 ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{formatNumber(words)} words</span>
                    </>
                  ) : null}
                  {note.tags.slice(0, 1).map((tag) => (
                    <Chip key={tag} size="sm" variant="soft">
                      {tag}
                    </Chip>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
