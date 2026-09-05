"use client";

import { toast } from "@heroui/react";
import { useCallback, useState } from "react";

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

  const mutate = useCallback(
    async (...args: TArgs) => {
      setIsPending(true);
      setError(undefined);
      try {
        const result = await run(...args);

        if (options.successMessage) {
          toast.success(
            typeof options.successMessage === "function"
              ? options.successMessage(result)
              : options.successMessage,
          );
        }
        await options.onSuccess?.(result);
        return result;
      } catch (cause) {
        const failure = cause instanceof Error ? cause : new Error(String(cause));
        setError(failure);
        toast.danger(options.errorMessage ? `${options.errorMessage}: ${failure.message}` : failure.message);
        return undefined;
      } finally {
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
