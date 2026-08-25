import type { User } from "@supabase/supabase-js";

import type { UserData } from "@/types/user";

/**
 * The name to show for an account.
 *
 * The profile wins: `first_name` / `last_name` on public.user_data are what an
 * admin sets on /admin/users, so they are the name the practice agreed on. The
 * auth user's metadata is the fallback — an invitation carries those two fields
 * before a profile row is ever read, which is what a freshly invited user is
 * greeted by. The email's local part is the last resort, because every account
 * has one.
 */
export function userDisplayName(
  user?: Pick<User, "email" | "user_metadata"> | null,
  userData?: Pick<UserData, "first_name" | "last_name"> | null
): string {
  const fromProfile = [userData?.first_name, userData?.last_name]
    .filter(Boolean)
    .join(" ");
  if (fromProfile) return fromProfile;

  const meta = user?.user_metadata ?? {};
  const fromMetadata =
    meta.full_name ||
    meta.name ||
    [meta.first_name, meta.last_name].filter(Boolean).join(" ");

  return fromMetadata || user?.email?.split("@")[0] || "User";
}

/**
 * The two letters an avatar falls back to: first and last initial of the name,
 * both of a single word, and the email's first letter when there is no name at
 * all.
 */
export function userInitials(name: string, email?: string | null): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0]) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email?.[0] ?? "U").toUpperCase();
}
