"use client";

import { toast } from "@heroui/react";
import { useCallback, useRef, useState } from "react";
import { notifyDataChanged } from "./data-version";

const SUCCESS_TOAST_MS = 4000;
const ERROR_TOAST_MS = 8000;

export interface MutationResult<TArgs extends unknown[], TResult> {
  /** Runs the mutation. Resolves with the result, or `undefined` if it failed. */
  mutate: (...args: TArgs) => Promise<TResult | undefined>;
  isPending: boolean;
  error: Error | undefined;
  reset: () => void;
}

interface MutationOptions<TResult> {
  /** Toast shown on success. Omit for silent mutations. */
  successMessage?: string | ((result: TResult) => string);
  /** Prefix for the error toast; the underlying message is appended. */
  errorMessage?: string;
  onSuccess?: (result: TResult) => void | Promise<void>;
}

/**
 * Runs an async write with pending/error state and user feedback.
 *
 * Errors are surfaced twice on purpose: as a toast (so the user notices) and as
 * `error` (so a form can render the message inline next to the fields).
 */
export function useMutation<TArgs extends unknown[], TResult>(
  run: (...args: TArgs) => Promise<TResult>,
  options: MutationOptions<TResult> = {},
): MutationResult<TArgs, TResult> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  // Guards against double submission. `isPending` cannot do this on its own:
  // it is React state, so a second tap in the same tick reads the stale `false`
  // and fires the write twice before the disabled button ever re-renders.
  const inFlightRef = useRef(false);

  const mutate = useCallback(
    async (...args: TArgs) => {
      if (inFlightRef.current) return undefined;
      inFlightRef.current = true;

      setIsPending(true);
      setError(undefined);
      try {
        const result = await run(...args);

        // Lets views above the page (the navigation badges) know their counts
        // are out of date; page-level lists still refetch through `onSuccess`.
        notifyDataChanged();

        if (options.successMessage) {
          toast.success(
            typeof options.successMessage === "function"
              ? options.successMessage(result)
              : options.successMessage,
            // Toasts do not dismiss themselves without this, and at the
            // bottom-end placement they sit on top of the mobile navigation
            // bar and swallow taps meant for it.
            { timeout: SUCCESS_TOAST_MS },
          );
        }
        await options.onSuccess?.(result);
        return result;
      } catch (cause) {
        const failure = cause instanceof Error ? cause : new Error(String(cause));
        setError(failure);
        // Errors linger longer than successes — there is usually something to
        // read — but they still clear themselves rather than stacking up.
        toast.danger(
          options.errorMessage ? `${options.errorMessage}: ${failure.message}` : failure.message,
          { timeout: ERROR_TOAST_MS },
        );
        return undefined;
      } finally {
        inFlightRef.current = false;
        setIsPending(false);
      }
    },
    // `options` is read fresh on each call; `run` is the only real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run],
  );

  const reset = useCallback(() => setError(undefined), []);

  return { mutate, isPending, error, reset };
}
