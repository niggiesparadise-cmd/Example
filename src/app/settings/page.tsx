"use client";

import { Alert, Button, Card, Spinner } from "@heroui/react";
import { Database, LogOut, Trash2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TextInputField } from "@/components/form/text-field";
import { ErrorState, ListSkeleton } from "@/components/ui/data-states";
import { ConfirmDeleteDialog } from "@/components/ui/form-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { useAuth } from "@/features/auth/auth-provider";
import { updateProfile } from "@/features/profile/api";
import { useProfile } from "@/features/profile/use-profile";
import { clearMyData, seedDemoData, type SeedProgress } from "@/features/seed/seed";
import { useMutation } from "@/features/shared/use-mutation";

export default function SettingsPage() {
  const { data: profile, error, isLoading, refetch } = useProfile();
  const { signOut, user } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState<string | null>(null);
  const [program, setProgram] = useState<string | null>(null);
  const [term, setTerm] = useState<string | null>(null);
  const [progress, setProgress] = useState<SeedProgress | undefined>(undefined);
  const [isClearOpen, setIsClearOpen] = useState(false);

  // `null` means "not edited yet", so the saved value shows until the user types.
  const nameValue = fullName ?? profile?.full_name ?? "";
  const programValue = program ?? profile?.program ?? "";
  const termValue = term ?? profile?.term ?? "";

  const save = useMutation(
    async () =>
      updateProfile({
        full_name: nameValue.trim() || null,
        program: programValue.trim() || null,
        term: termValue.trim() || null,
      }),
    {
      successMessage: "Profile saved.",
      errorMessage: "Couldn't save your profile",
      onSuccess: () => void refetch(),
    },
  );

  const seed = useMutation(async () => seedDemoData(setProgress), {
    successMessage: "Demo data loaded.",
    errorMessage: "Couldn't load the demo data",
    onSuccess: () => {
      setProgress(undefined);
      void refetch();
    },
  });

  const clear = useMutation(async () => clearMyData(), {
    successMessage: "All your data was deleted.",
    errorMessage: "Couldn't clear your data",
    onSuccess: () => {
      setIsClearOpen(false);
      void refetch();
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader description="Your profile, and tools for testing with data." title="Settings" />

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} title="Couldn't load your profile" />
      ) : (
        <>
          <SectionCard
            description={user?.email ?? ""}
            icon={<User aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
            title="Profile"
          >
            <form
              className="flex flex-col gap-4"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void save.mutate();
              }}
            >
              <TextInputField label="Full name" onChange={setFullName} placeholder="Mara Ellison" value={nameValue} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextInputField label="Programme" onChange={setProgram} placeholder="BSc Computer Science" value={programValue} />
                <TextInputField label="Term" onChange={setTerm} placeholder="Autumn 2026" value={termValue} />
              </div>
              <div>
                <Button isDisabled={save.isPending} type="submit" variant="primary">
                  {save.isPending ? "Saving…" : "Save profile"}
                </Button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            description="Populate your account with a sample term, or start over."
            icon={<Database aria-hidden="true" className="size-[18px]" strokeWidth={1.85} />}
            title="Demo data"
          >
            <Alert status="warning">
              <Alert.Content>
                <Alert.Description>
                  These write to your real account through the normal API. Use them for trying the app out,
                  not alongside data you care about.
                </Alert.Description>
              </Alert.Content>
            </Alert>

            {seed.isPending && progress ? (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Spinner size="sm" />
                {progress.step}… ({progress.done}/{progress.total})
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button isDisabled={seed.isPending || clear.isPending} onPress={() => void seed.mutate()} variant="secondary">
                {seed.isPending ? "Loading…" : "Load demo data"}
              </Button>
              <Button isDisabled={seed.isPending || clear.isPending} onPress={() => setIsClearOpen(true)} variant="danger-soft">
                <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.85} />
                Clear my data
              </Button>
            </div>
          </SectionCard>

          <Card className="border border-border p-5">
            <Card.Content>
              <Button
                onPress={() => void signOut().then(() => router.replace("/sign-in/"))}
                variant="tertiary"
              >
                <LogOut aria-hidden="true" className="size-4" strokeWidth={1.85} />
                Sign out
              </Button>
            </Card.Content>
          </Card>
        </>
      )}

      <ConfirmDeleteDialog
        description="Every course, task, exam, note, schedule event and study session in your account will be permanently deleted. Your account itself stays."
        isOpen={isClearOpen}
        isPending={clear.isPending}
        onConfirm={() => void clear.mutate()}
        onOpenChange={setIsClearOpen}
        title="Delete all your data?"
      />
    </div>
  );
}
