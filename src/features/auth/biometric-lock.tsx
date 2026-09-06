"use client";

import { Alert, Button } from "@heroui/react";
import { Fingerprint, Lock, ShieldAlert } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { FullPageLoading } from "@/components/ui/data-states";
import { useAppLock } from "./app-lock-provider";
import { useAuth } from "./auth-provider";
import { useMutation } from "@/features/shared/use-mutation";

/**
 * Stands between the signed-in session and the dashboard.
 *
 * The children are not rendered while locked — they are not mounted at all —
 * so no page runs a query and no row is fetched, let alone shown. That is what
 * makes "do not display private user data until unlocked" true of the data and
 * not just of the pixels.
 */
export function BiometricLockGate({ children }: { children: ReactNode }) {
  const { availability, isPrompting, lastFailure, status, unlock } =
    useAppLock();

  // Show the prompt as soon as the app is locked, without waiting for a tap —
  // requirement 2's "immediately require biometric authentication". The ref
  // stops a re-render from stacking a second prompt on top of the first.
  const promptedForRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (status !== "locked" || isPrompting) return;
    // Only auto-prompt once per lock; after a failure the user taps to retry,
    // so a cancelled dialog cannot become an unclosable loop.
    if (promptedForRef.current === "locked" || lastFailure) return;
    promptedForRef.current = "locked";
    void unlock();
  }, [isPrompting, lastFailure, status, unlock]);

  useEffect(() => {
    if (status === "unlocked") promptedForRef.current = undefined;
  }, [status]);

  if (status === "checking")
    return <FullPageLoading label="Checking this device…" />;
  if (status === "unlocked") return <>{children}</>;

  return (
    <LockScreen
      isUnsupported={status === "unsupported"}
      reason={availability?.reason}
    />
  );
}

function LockScreen({
  isUnsupported,
  reason,
}: {
  isUnsupported: boolean;
  reason?: string;
}) {
  const { isPrompting, lastFailure, unlock } = useAppLock();
  const { signOut } = useAuth();

  const leave = useMutation(async () => signOut(), {
    errorMessage: "Couldn't sign out",
  });

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-surface ring-1 ring-border">
          {isUnsupported ? (
            <ShieldAlert
              aria-hidden="true"
              className="size-6 text-warning"
              strokeWidth={1.75}
            />
          ) : (
            <Lock
              aria-hidden="true"
              className="size-6 text-muted"
              strokeWidth={1.75}
            />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-xl font-semibold text-foreground">
            {isUnsupported
              ? "This device can't be secured"
              : "Study Dashboard is locked"}
          </h1>
          <p className="text-sm text-muted">
            {isUnsupported
              ? "Your session stays locked because this device has no fingerprint, face unlock or screen lock to verify you with."
              : "Verify it's you to open your courses, tasks and notes."}
          </p>
        </div>

        {isUnsupported ? (
          <Alert status="warning">
            <Alert.Content>
              <Alert.Title>Set up a screen lock</Alert.Title>
              <Alert.Description>
                {reason ?? "No biometric or device credential is enrolled."} Add
                a fingerprint, face unlock, PIN or password in Android Settings,
                then reopen the app. Signing out is the only other way forward —
                your data stays safe in the meantime.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : lastFailure ? (
          <Alert
            status={lastFailure.code === "userCancelled" ? "warning" : "danger"}
          >
            <Alert.Content>
              <Alert.Title>{titleFor(lastFailure.code)}</Alert.Title>
              <Alert.Description>{lastFailure.message}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {!isUnsupported ? (
          <Button
            fullWidth
            isDisabled={isPrompting}
            onPress={() => void unlock()}
            size="lg"
            variant="primary"
          >
            <Fingerprint
              aria-hidden="true"
              className="size-4"
              strokeWidth={2}
            />
            {isPrompting ? "Waiting for verification…" : "Unlock"}
          </Button>
        ) : null}

        <Button
          fullWidth
          isDisabled={leave.isPending}
          onPress={() => void leave.mutate()}
          variant="tertiary"
        >
          {leave.isPending ? "Signing out…" : "Sign out instead"}
        </Button>
      </div>
    </div>
  );
}

function titleFor(code: string): string {
  switch (code) {
    case "userCancelled":
      return "Verification cancelled";
    case "lockout":
      return "Too many attempts";
    case "lockoutPermanent":
      return "Biometrics locked";
    case "noneEnrolled":
      return "Nothing enrolled to check";
    case "noHardware":
      return "No biometric hardware";
    default:
      return "Couldn't verify you";
  }
}
