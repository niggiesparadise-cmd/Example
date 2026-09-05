"use client";

import { Alert, Button, Link } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TextInputField } from "@/components/form/text-field";
import { useAuth } from "@/features/auth/auth-provider";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import {
  isValid,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateRequired,
} from "@/features/auth/validation";
import { useMutation } from "@/features/shared/use-mutation";

export default function SignUpPage() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [touched, setTouched] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const errors = {
    fullName: validateRequired(fullName, "Name"),
    email: validateEmail(email),
    password: validatePassword(password),
    confirmation: validatePasswordConfirmation(password, confirmation),
  };

  const { error, isPending, mutate } = useMutation(
    async () => signUp(email.trim(), password, fullName.trim()),
    {
      onSuccess: (result) => {
        // With email confirmation on, there is no session yet — say so rather
        // than dumping the user on a login screen with no explanation.
        if (result.needsEmailConfirmation) setAwaitingConfirmation(true);
        else router.replace("/");
      },
    },
  );

  if (awaitingConfirmation) {
    return (
      <AuthLayout
        description="One more step before you can sign in."
        footer={<Link href="/sign-in/">Back to sign in</Link>}
        title="Check your inbox"
      >
        <Alert status="success">
          <Alert.Content>
            <Alert.Title>Confirmation sent</Alert.Title>
            <Alert.Description>
              We emailed a confirmation link to {email.trim()}. Open it, then come back and sign in.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      description="Track your courses, deadlines and study time."
      footer={
        <>
          Already have an account? <Link href="/sign-in/">Sign in</Link>
        </>
      }
      title="Create your account"
    >
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
          autoComplete="name"
          errorMessage={touched ? errors.fullName : undefined}
          isRequired
          label="Full name"
          onChange={setFullName}
          placeholder="Mara Ellison"
          value={fullName}
        />
        <TextInputField
          autoComplete="email"
          errorMessage={touched ? errors.email : undefined}
          isRequired
          label="Email"
          onChange={setEmail}
          placeholder="you@university.edu"
          type="email"
          value={email}
        />
        <TextInputField
          autoComplete="new-password"
          errorMessage={touched ? errors.password : undefined}
          hint="At least 8 characters."
          isRequired
          label="Password"
          onChange={setPassword}
          type="password"
          value={password}
        />
        <TextInputField
          autoComplete="new-password"
          errorMessage={touched ? errors.confirmation : undefined}
          isRequired
          label="Confirm password"
          onChange={setConfirmation}
          type="password"
          value={confirmation}
        />

        <Button fullWidth isDisabled={isPending} type="submit" variant="primary">
          {isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
