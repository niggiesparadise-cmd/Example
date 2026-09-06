"use client";

import { Alert, Button, Spinner } from "@heroui/react";
import { Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useMutation } from "@/features/shared/use-mutation";
import { describeAvatarFile, removeAvatar, uploadAvatar } from "./avatar";
import { forgetAvatarUrl, UserAvatar } from "./user-avatar";
import { useProfile } from "./use-profile";

/**
 * Choosing a profile picture.
 *
 * A hidden file input behind a button, because a styled `<input type=file>` is
 * a fight nobody wins — and on Android this is what opens the system picker and
 * the camera. The file is validated here for a readable message, resized before
 * it is uploaded, and validated again by the bucket, which is the check that
 * actually counts.
 */
export function AvatarPicker({ onChanged }: { onChanged?: () => void }) {
  const { data: profile, refetch } = useProfile();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rejected, setRejected] = useState<string | undefined>(undefined);

  const upload = useMutation(async (file: File) => uploadAvatar(file), {
    successMessage: "Profile picture updated.",
    errorMessage: "Couldn't update your picture",
    onSuccess: async () => {
      // The old signed URL is for the old object; drop it so the new one loads.
      forgetAvatarUrl(profile?.avatar_path);
      await refetch();
      onChanged?.();
    },
  });

  const clear = useMutation(async () => removeAvatar(), {
    successMessage: "Profile picture removed.",
    errorMessage: "Couldn't remove your picture",
    onSuccess: async () => {
      forgetAvatarUrl(profile?.avatar_path);
      await refetch();
      onChanged?.();
    },
  });

  const isBusy = upload.isPending || clear.isPending;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <span className="relative">
          <UserAvatar size="xl" />
          {isBusy ? (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
              <Spinner size="sm" />
            </span>
          ) : null}
        </span>

        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button isDisabled={isBusy} onPress={() => inputRef.current?.click()} size="sm" variant="secondary">
              <Upload aria-hidden="true" className="size-4" strokeWidth={2} />
              {upload.isPending ? "Uploading…" : profile?.avatar_path ? "Change" : "Upload"}
            </Button>
            {profile?.avatar_path ? (
              <Button isDisabled={isBusy} onPress={() => void clear.mutate()} size="sm" variant="ghost">
                <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.9} />
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted">
            JPEG, PNG or WebP, up to 2 MB. Cropped to a square and resized before upload.
          </p>
        </div>
      </div>

      {rejected ? (
        <Alert status="warning">
          <Alert.Content>
            <Alert.Description>{rejected}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {upload.error ? (
        <Alert status="danger">
          <Alert.Content>
            <Alert.Description>{upload.error.message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <input
        accept="image/jpeg,image/png,image/webp"
        aria-hidden="true"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset immediately so choosing the same file twice still fires.
          event.target.value = "";
          if (!file) return;

          const problem = describeAvatarFile(file);
          setRejected(problem);
          if (!problem) void upload.mutate(file);
        }}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
    </div>
  );
}
