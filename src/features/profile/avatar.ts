"use client";

import { getSupabase, requireUserId } from "../shared/api";
import { updateProfile } from "./api";

/**
 * Profile pictures.
 *
 * The image goes to Storage and only its path goes in the row — a database is
 * the wrong place for binaries, and a path keeps the bucket's own policies in
 * charge of who may fetch it. The bucket is private, so reading one means
 * minting a short-lived signed URL rather than linking to a public object.
 */

export const AVATAR_BUCKET = "avatars";

/** What the bucket's `allowed_mime_types` accepts. Checked here too, for a better message. */
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"] as const;
/** Matches the bucket's `file_size_limit`. */
const MAX_BYTES = 2 * 1024 * 1024;
/** Avatars are never displayed larger than this, so nothing larger is stored. */
const MAX_EDGE = 512;

export function describeAvatarFile(file: File): string | undefined {
  if (!ACCEPTED.includes(file.type as (typeof ACCEPTED)[number])) {
    return "Choose a JPEG, PNG or WebP image.";
  }
  if (file.size > MAX_BYTES) {
    return "That image is larger than 2 MB. Choose a smaller one.";
  }
  return undefined;
}

/**
 * Squares and shrinks the image before it leaves the device.
 *
 * A phone camera produces several megabytes for something rendered at 40px.
 * Resizing here means the upload is quick on a slow connection and the stored
 * object stays small. If anything about the canvas path fails — an exotic
 * format, a locked-down WebView — the original file is uploaded instead, which
 * the bucket's own limits still police.
 */
async function toSquareWebp(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const edge = Math.min(bitmap.width, bitmap.height);
    const size = Math.min(edge, MAX_EDGE);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return file;

    // Centre crop, so a portrait photo does not end up stretched.
    context.drawImage(
      bitmap,
      (bitmap.width - edge) / 2,
      (bitmap.height - edge) / 2,
      edge,
      edge,
      0,
      0,
      size,
      size,
    );
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.86),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

/**
 * Uploads a new avatar and points the profile at it.
 *
 * The filename carries a timestamp so a replacement is a new object rather than
 * an overwrite — signed URLs and any cache in front of them then cannot serve
 * the previous picture. The old object is removed afterwards, and a failure to
 * remove it is not allowed to fail the upload the user just watched succeed.
 */
export async function uploadAvatar(file: File): Promise<string> {
  const problem = describeAvatarFile(file);
  if (problem) throw new Error(problem);

  const userId = await requireUserId();
  const supabase = getSupabase();

  const image = await toSquareWebp(file);
  const extension = image.type === "image/webp" ? "webp" : file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, image, {
    contentType: image.type || file.type,
    upsert: false,
  });
  if (error) throw new Error(`Couldn't upload that image: ${error.message}`);

  const previous = await currentAvatarPath();
  await updateProfile({ avatar_path: path });
  if (previous && previous !== path) await removeObject(previous);

  return path;
}

/** Clears the avatar, then deletes the object it referred to. */
export async function removeAvatar(): Promise<void> {
  const previous = await currentAvatarPath();
  await updateProfile({ avatar_path: null });
  if (previous) await removeObject(previous);
}

async function currentAvatarPath(): Promise<string | null> {
  const userId = await requireUserId();
  const { data } = await getSupabase()
    .from("profiles")
    .select("avatar_path")
    .eq("id", userId)
    .maybeSingle();
  return data?.avatar_path ?? null;
}

async function removeObject(path: string): Promise<void> {
  // Best effort: the row already points elsewhere, so a stranded object is
  // untidy rather than incorrect, and is not worth an error the user can act on.
  await getSupabase().storage.from(AVATAR_BUCKET).remove([path]);
}

/**
 * A signed URL for a stored avatar.
 *
 * The bucket is private, so this is the only way to render one — and it only
 * succeeds when the storage policies say this caller may read that object,
 * which for somebody else's avatar means sharing a challenge with them.
 */
export async function signedAvatarUrl(path: string, seconds = 3600): Promise<string | null> {
  const { data, error } = await getSupabase()
    .storage.from(AVATAR_BUCKET)
    .createSignedUrl(path, seconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Initials for the fallback: "Mara Ellison" → "ME", "ada" → "AD". */
export function initialsFrom(name: string | null | undefined, fallback = "?"): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return fallback;
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
