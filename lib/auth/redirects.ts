import type { EmailOtpType } from "@supabase/supabase-js";

import type { AuthErrorKey } from "./errors";

/** The OTP types that can reach /auth/confirm; anything else is rejected. */
export const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

export function isEmailOtpType(value: string | null): value is EmailOtpType {
  return !!value && (EMAIL_OTP_TYPES as readonly string[]).includes(value);
}

/**
 * Where each kind of email link lands once its token has been accepted.
 *
 * A recovery link has to end on the form that sets a new password, and an
 * invite on the one that turns the invited account into a usable one. The rest
 * just need a signed-in destination; "/" is rewritten to the patients list by
 * the proxy.
 */
const LANDING: Record<EmailOtpType, string> = {
  invite: "/accept-invite",
  recovery: "/update-password",
  signup: "/",
  magiclink: "/",
  email_change: "/",
  email: "/",
};

export function landingFor(type: EmailOtpType): string {
  return LANDING[type] ?? "/";
}

/**
 * Keep `?next=` pointing inside the app.
 *
 * It comes off a link in an email, so it is attacker-controllable in the same
 * way any query string is: without this, `?next=//evil.example` would turn our
 * own confirm route into an open redirect that hands over a fresh session.
 */
export function safeNextPath(next: string | null, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  // "//host" and "/\host" are protocol-relative — both leave the app.
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/**
 * Where to send someone whose link did not work, with the reason attached.
 *
 * A dead recovery link belongs on the form that sends a new one; everything
 * else goes back to the login page, which renders `?error=` the same way.
 */
export function failurePath(type: EmailOtpType | null, key: AuthErrorKey): string {
  const reason: AuthErrorKey =
    type === "invite" && key === "linkExpired" ? "inviteExpired" : key;
  const target = type === "recovery" ? "/forgot-password" : "/login";
  return `${target}?error=${reason}`;
}
