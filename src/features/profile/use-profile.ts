"use client";

import { useQuery } from "@/features/shared/use-query";
import { getProfile } from "./api";

/** The signed-in user's profile row, with loading and error state. */
export function useProfile() {
  return useQuery(getProfile, []);
}

/** Initials for the avatar, derived from the name or falling back to the email. */
export function initialsOf(fullName: string | null | undefined, email: string | null | undefined): string {
  const name = fullName?.trim();
  if (name) {
    const parts = name.split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
  }
  return email?.[0]?.toUpperCase() ?? "?";
}
