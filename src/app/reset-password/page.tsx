"use client";

import { Alert, Button, Link } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TextInputField } from "@/components/form/text-field";
import { useAuth } from "@/features/auth/auth-provider";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { isValid, validatePassword, validatePasswordConfirmation } from "@/features/auth/validation";
import { useMutation } from "@/features/shared/use-mutation";

/**
 * Where the emailed recovery link lands.
 *
 * Supabase puts the recovery token in the URL fragment; the client is created
 * with `detectSessionInUrl`, so by the time this renders the user already has a
 * temporary session and `updateUser` is allowed to set a new password.
 */
export default function ResetPasswordPage() {
  const { session, updatePassword } = useAuth();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [touched, setTouched] = useState(false);

  const errors = {
    password: validatePassword(password),
    confirmation: validatePasswordConfirmation(password, confirmation),
  };

  const { error, isPending, mutate } = useMutation(async () => updatePassword(password), {
    successMessage: "Password updated.",
    onSuccess: () => router.replace("/"),
  });

  return (
    <AuthLayout
      description="Choose a new password for your account."
      footer={<Link href="/sign-in/">Back to sign in</Link>}
      title="Set a new password"
    >
      {!session ? (
        <Alert status="warning">
          <Alert.Content>
            <Alert.Title>This link has expired</Alert.Title>
            <Alert.Description>
              Reset links are single use and time limited. Request a new one from the sign-in screen.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : (
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setTouched(true);
            if (isValid(errors)) void mutate();
          }}
        >
          {error ? (
            <Alert status="danger">
              <Alert.Content>
                <Alert.Description>{error.message}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <TextInputField
            autoComplete="new-password"
            errorMessage={touched ? errors.password : undefined}
            hint="At least 8 characters."
            isRequired
            label="New password"
            onChange={setPassword}
            type="password"
            value={password}
          />
          <TextInputField
            autoComplete="new-password"
            errorMessage={touched ? errors.confirmation : undefined}
            isRequired
            label="Confirm new password"
            onChange={setConfirmation}
            type="password"
            value={confirmation}
          />

          <Button fullWidth isDisabled={isPending} type="submit" variant="primary">
            {isPending ? "Updating…" : "Update password"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
