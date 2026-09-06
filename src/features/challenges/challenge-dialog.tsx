"use client";

import { Alert, Button, Input, Label, TextField, cn } from "@heroui/react";
import { Search, Swords } from "lucide-react";
import { useState } from "react";
import { FormDialog } from "@/components/ui/form-dialog";
import { ProfileAvatar } from "@/features/profile/user-avatar";
import { useMutation } from "@/features/shared/use-mutation";
import type { PublicProfile, Quiz } from "@/lib/supabase/database.types";
import { createChallenge, searchUsers } from "./api";

/**
 * Inviting somebody to take your quiz.
 *
 * The only way to find a person is by typing their username, and the search
 * runs through a database function that returns a handle, a display name and an
 * avatar path — never an email, never a programme, never a list of everybody.
 * Three characters minimum, so the box cannot be used to page through the
 * directory a letter at a time.
 */
export function ChallengeDialog({
  isOpen,
  onOpenChange,
  quiz,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: Quiz;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicProfile[] | undefined>(undefined);
  const [selected, setSelected] = useState<PublicProfile | undefined>(undefined);
  const [title, setTitle] = useState(`${quiz.title} Challenge`);

  const search = useMutation(async (value: string) => searchUsers(value), {
    errorMessage: "Couldn't search",
    onSuccess: (found) => setResults(found),
  });

  const invite = useMutation(
    async () => {
      if (!selected?.username) throw new Error("Choose somebody to challenge first.");
      return createChallenge({
        quizId: quiz.id,
        opponentUsername: selected.username,
        title: title.trim() || `${quiz.title} Challenge`,
      });
    },
    {
      successMessage: "Challenge sent.",
      errorMessage: "Couldn't send the challenge",
      onSuccess: () => onOpenChange(false),
    },
  );

  return (
    <FormDialog
      error={invite.error}
      isOpen={isOpen}
      isPending={invite.isPending}
      onOpenChange={onOpenChange}
      onSubmit={() => {
        if (selected) void invite.mutate();
      }}
      submitLabel="Send challenge"
      title="Challenge somebody"
    >
      <Alert status="accent">
        <Alert.Content>
          <Alert.Description>
            They will be able to see and answer <strong>{quiz.title}</strong> — and nothing else of
            yours.
          </Alert.Description>
        </Alert.Content>
      </Alert>

      <div className="flex flex-col gap-2">
        <Label>Find by username</Label>
        <div className="flex gap-2">
          <TextField
            aria-label="Username"
            className="flex-1"
            onChange={(value) => {
              setQuery(value);
              setSelected(undefined);
            }}
            validationBehavior="aria"
            value={query}
          >
            <Input autoCapitalize="none" autoCorrect="off" placeholder="their username" />
          </TextField>
          <Button
            isDisabled={query.trim().length < 3 || search.isPending}
            onPress={() => void search.mutate(query)}
            variant="secondary"
          >
            <Search aria-hidden="true" className="size-4" strokeWidth={2} />
            {search.isPending ? "Searching…" : "Search"}
          </Button>
        </div>
        <p className="text-xs text-muted">
          At least three characters. People are only findable by the username they chose.
        </p>
      </div>

      {results !== undefined ? (
        results.length === 0 ? (
          <p className="text-sm text-muted">No account matches that username.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {results.map((person) => {
              const isSelected = selected?.id === person.id;
              return (
                <li key={person.id}>
                  <button
                    aria-pressed={isSelected}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[var(--radius-glass)] border px-3 py-2.5 text-left",
                      "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                      isSelected
                        ? "border-accent bg-accent-soft"
                        : "border-border bg-surface hover:bg-surface-hover",
                    )}
                    onClick={() => setSelected(person)}
                    type="button"
                  >
                    <ProfileAvatar profile={person} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {person.full_name ?? person.username}
                      </span>
                      <span className="block truncate text-xs text-muted">@{person.username}</span>
                    </span>
                    {isSelected ? (
                      <Swords aria-hidden="true" className="size-4 text-accent" strokeWidth={2} />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )
      ) : null}

      {selected ? (
        <TextField aria-label="Challenge title" onChange={setTitle} validationBehavior="aria" value={title}>
          <Label>Title</Label>
          <Input />
        </TextField>
      ) : null}
    </FormDialog>
  );
}
