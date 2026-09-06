"use client";

import { cn } from "@heroui/react";
import { useEffect, useState } from "react";
import type { PublicProfile } from "@/lib/supabase/database.types";
import { initialsFrom, signedAvatarUrl } from "./avatar";
import { useProfile } from "./use-profile";

/**
 * An avatar, with a real fallback.
 *
 * Nobody is required to upload a picture, so the initials tile is the normal
 * state rather than a placeholder — it is tinted deterministically from the
 * name so the same person is the same colour everywhere in the app.
 *
 * The bucket is private, so a stored image needs a signed URL. That is fetched
 * per avatar and cached for the page's lifetime; if signing fails (no
 * permission, object gone) the initials simply stay, which is the right
 * outcome rather than a broken image icon.
 */

const SIZES = {
  sm: "size-8 text-[11px]",
  md: "size-10 text-xs",
  lg: "size-14 text-base",
  xl: "size-20 text-xl",
} as const;

export type AvatarSize = keyof typeof SIZES;

/** Signed URLs are shared across every avatar showing the same object. */
const urlCache = new Map<string, Promise<string | null>>();

function cachedSignedUrl(path: string): Promise<string | null> {
  let pending = urlCache.get(path);
  if (!pending) {
    pending = signedAvatarUrl(path);
    urlCache.set(path, pending);
  }
  return pending;
}

/** Drops a cached URL so the next render re-signs — used after an upload. */
export function forgetAvatarUrl(path: string | null | undefined): void {
  if (path) urlCache.delete(path);
}

/** Five stable tints, keyed off the name so one person keeps one colour. */
function tintOf(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 5;
  }
  return ["bg-course-1/15 text-course-1", "bg-course-2/15 text-course-2", "bg-course-3/15 text-course-3", "bg-course-4/15 text-course-4", "bg-course-5/15 text-course-5"][hash];
}

export function Avatar({
  className,
  name,
  path,
  size = "md",
}: {
  className?: string;
  name: string | null | undefined;
  path: string | null | undefined;
  size?: AvatarSize;
}) {
  /*
   * The resolved URL is stored with the path it belongs to, and matched during
   * render. Storing a bare URL would need an effect to clear it when `path`
   * changes — a synchronous setState in an effect body, and a frame where the
   * previous person's picture is shown under the new person's name.
   */
  const [resolved, setResolved] = useState<{ path: string; url: string } | null>(null);
  const url = resolved && resolved.path === path ? resolved.url : null;

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    void cachedSignedUrl(path).then((signed) => {
      if (!cancelled && signed) setResolved({ path, url: signed });
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const initials = initialsFrom(name);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "font-semibold ring-1 ring-border select-none",
        SIZES[size],
        url ? "bg-surface-secondary" : tintOf(initials),
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="size-full object-cover" src={url} />
      ) : (
        initials
      )}
    </span>
  );
}

/** The signed-in user's own avatar. */
export function UserAvatar({ className, size = "md" }: { className?: string; size?: AvatarSize }) {
  const { data: profile } = useProfile();
  return (
    <Avatar
      className={className}
      name={profile?.full_name ?? profile?.username}
      path={profile?.avatar_path}
      size={size}
    />
  );
}

/** Somebody else's avatar, from the narrow shape the lookup functions return. */
export function ProfileAvatar({
  className,
  profile,
  size = "md",
}: {
  className?: string;
  profile: Pick<PublicProfile, "full_name" | "username" | "avatar_path"> | undefined;
  size?: AvatarSize;
}) {
  return (
    <Avatar
      className={className}
      name={profile?.full_name ?? profile?.username}
      path={profile?.avatar_path}
      size={size}
    />
  );
}
