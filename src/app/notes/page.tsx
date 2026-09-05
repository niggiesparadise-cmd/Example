"use client";

import { Button, Card, Chip, SearchField } from "@heroui/react";
import { NotebookPen, Pencil, Pin, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { CourseDot } from "@/components/ui/course-dot";
import { ErrorState, ListSkeleton, LoadingRegion, NoData } from "@/components/ui/data-states";
import { ConfirmDeleteDialog } from "@/components/ui/form-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { listCourses } from "@/features/courses/api";
import { deleteNote, searchNotes } from "@/features/notes/api";
import { NoteFormDialog } from "@/features/notes/note-form";
import { useMutation } from "@/features/shared/use-mutation";
import { useQuery } from "@/features/shared/use-query";
import type { Note } from "@/lib/supabase/database.types";
import { relativeDayLabel } from "@/lib/date";

export default function NotesPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const load = useCallback(async () => {
    const [notes, courses] = await Promise.all([searchNotes(submittedQuery), listCourses()]);
    return { notes, courses };
  }, [submittedQuery]);

  const { data, error, isLoading, refetch } = useQuery(load, [submittedQuery]);
  const [editing, setEditing] = useState<Note | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Note | undefined>(undefined);

  const remove = useMutation(async (id: string) => deleteNote(id), {
    successMessage: "Note deleted.",
    errorMessage: "Couldn't delete the note",
    onSuccess: () => {
      setPendingDelete(undefined);
      void refetch();
    },
  });

  const notes = data?.notes ?? [];
  const courses = data?.courses ?? [];
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const isSearching = submittedQuery.trim().length > 0;

  const openForm = (note?: Note) => {
    setEditing(note);
    setIsFormOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PageHeader
        actions={
          <Button onPress={() => openForm()} size="sm" variant="primary">
            <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
            New note
          </Button>
        }
        description="Lecture notebooks and revision summaries."
        title="Notes"
      />

      {/* Search runs in Postgres against the generated tsvector, not in the client. */}
      <SearchField
        aria-label="Search notes"
        className="max-w-md"
        onChange={setQuery}
        onSubmit={() => setSubmittedQuery(query)}
        onClear={() => {
          setQuery("");
          setSubmittedQuery("");
        }}
        value={query}
      >
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search titles and note text…" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      {isLoading ? (
        <>
          <LoadingRegion label="Loading notes" />
          <ListSkeleton rows={4} />
        </>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load your notes" />
      ) : notes.length === 0 ? (
        <Card className="border border-border p-8">
          <NoData
            action={
              !isSearching ? (
                <Button onPress={() => openForm()} size="sm" variant="primary">
                  <Plus aria-hidden="true" className="size-4" strokeWidth={2.25} />
                  Write your first note
                </Button>
              ) : undefined
            }
            description={
              isSearching
                ? `Nothing matches "${submittedQuery}". Try different words.`
                : "Keep lecture notes and revision summaries here."
            }
            icon={<NotebookPen aria-hidden="true" className="size-5" strokeWidth={1.75} />}
            title={isSearching ? "No matches" : "No notes yet"}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => {
            const course = note.course_id ? courseById.get(note.course_id) : undefined;

            return (
              <Card key={note.id} className="gap-3 border border-border p-5">
                <Card.Header className="flex-row items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    {note.is_pinned ? (
                      <Pin aria-label="Pinned" className="mt-0.5 size-3.5 shrink-0 text-muted" strokeWidth={1.85} />
                    ) : null}
                    <Card.Title className="text-sm font-semibold text-balance">{note.title}</Card.Title>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button aria-label={`Edit ${note.title}`} isIconOnly onPress={() => openForm(note)} size="sm" variant="ghost">
                      <Pencil aria-hidden="true" className="size-3.5" strokeWidth={1.85} />
                    </Button>
                    <Button
                      aria-label={`Delete ${note.title}`}
                      isIconOnly
                      onPress={() => setPendingDelete(note)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" className="size-3.5" strokeWidth={1.85} />
                    </Button>
                  </div>
                </Card.Header>

                <Card.Content className="gap-2">
                  {note.content ? <p className="line-clamp-4 text-sm text-muted">{note.content}</p> : null}

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    {course ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CourseDot course={course} />
                        {course.code}
                      </span>
                    ) : null}
                    <span>{relativeDayLabel(note.updated_at.slice(0, 10))}</span>
                    {note.tags.map((tag) => (
                      <Chip key={tag} size="sm" variant="soft">
                        {tag}
                      </Chip>
                    ))}
                  </div>
                </Card.Content>
              </Card>
            );
          })}
        </div>
      )}

      {isFormOpen ? (
        <NoteFormDialog
          key={`${editing?.id ?? 'new'}`}
          courses={courses}
          isOpen={isFormOpen}
          note={editing}
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
        title="Delete this note?"
      />
    </div>
  );
}
