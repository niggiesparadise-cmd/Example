"use client";

import { Alert, Button, Link } from "@heroui/react";
import { useState } from "react";
import { TextInputField } from "@/components/form/text-field";
import { useAuth } from "@/features/auth/auth-provider";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { validateEmail } from "@/features/auth/validation";
import { useMutation } from "@/features/shared/use-mutation";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);

  const emailError = validateEmail(email);

  const { error, isPending, mutate } = useMutation(async () => requestPasswordReset(email.trim()), {
    onSuccess: () => setSent(true),
  });

  return (
    <AuthLayout
      description={sent ? "Follow the link in your email to choose a new password." : "We'll email you a reset link."}
      footer={<Link href="/sign-in/">Back to sign in</Link>}
      title={sent ? "Check your inbox" : "Reset your password"}
    >
      {sent ? (
        <Alert status="success">
          <Alert.Content>
            <Alert.Description>
              If an account exists for {email.trim()}, a reset link is on its way.
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
            if (!emailError) void mutate();
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
            autoComplete="email"
            errorMessage={touched ? emailError : undefined}
            isRequired
            label="Email"
            onChange={setEmail}
            placeholder="you@university.edu"
            type="email"
            value={email}
          />

          <Button fullWidth isDisabled={isPending} type="submit" variant="primary">
            {isPending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
