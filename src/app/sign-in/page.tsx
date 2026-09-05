"use client";

import { Alert, Button, Link } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TextInputField } from "@/components/form/text-field";
import { useAuth } from "@/features/auth/auth-provider";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { isValid, validateEmail, validateRequired } from "@/features/auth/validation";
import { useMutation } from "@/features/shared/use-mutation";

export default function SignInPage() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);

  const errors = {
    email: validateEmail(email),
    password: validateRequired(password, "Password"),
  };

  const { error, isPending, mutate } = useMutation(
    async () => {
      await signIn(email.trim(), password);
    },
    { onSuccess: () => router.replace("/") },
  );

  return (
    <AuthLayout
      description="Sign in to pick up where you left off."
      footer={
        <>
          New here? <Link href="/sign-up/">Create an account</Link>
        </>
      }
      title="Welcome back"
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
          autoComplete="current-password"
          errorMessage={touched ? errors.password : undefined}
          hint={<Link href="/forgot-password/">Forgot your password?</Link>}
          isRequired
          label="Password"
          onChange={setPassword}
          type="password"
          value={password}
        />

        <Button fullWidth isDisabled={isPending} type="submit" variant="primary">
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
