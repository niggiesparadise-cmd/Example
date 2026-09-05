import { Chip } from "@heroui/react";
import { NotebookPen, Pin } from "lucide-react";
import { CardLink } from "@/components/ui/card-link";
import { CourseDot } from "@/components/ui/course-dot";
import { SectionCard } from "@/components/ui/section-card";
import { courseOf, recentNotes } from "@/data";
import { relativeDayLabel } from "@/lib/date";
import { formatNumber } from "@/lib/format";

/** The notebooks touched most recently. */
export function RecentNotes() {
  const items = recentNotes(4);

  return (
    <SectionCard
      action={<CardLink href="/notes">All notes</CardLink>}
      description="Picking up where you left off"
      icon={<NotebookPen aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
      title="Recent notes"
    >
      <ul className="flex flex-col divide-y divide-border">
        {items.map((note) => {
          const course = courseOf(note.courseId);

          return (
            <li key={note.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-balance text-foreground">{note.title}</p>
                {note.isPinned ? (
                  <Pin aria-label="Pinned" className="size-3.5 shrink-0 text-muted" strokeWidth={1.85} />
                ) : null}
              </div>

              <p className="mt-1 line-clamp-2 text-xs text-muted">{note.excerpt}</p>

              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CourseDot course={course} />
                  {course.code}
                </span>
                <span aria-hidden="true">·</span>
                <span>{relativeDayLabel(note.updated)}</span>
                <span aria-hidden="true">·</span>
                <span>{formatNumber(note.wordCount)} words</span>
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
    </SectionCard>
  );
}
