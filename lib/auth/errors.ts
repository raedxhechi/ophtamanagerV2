import { isAuthError } from "@supabase/supabase-js";

/**
 * Minimum password length accepted by the UI.
 *
 * Mirrors `minimum_password_length` in supabase/config.toml — GoTrue rejects
 * anything shorter with a `weak_password` error, so validating client-side is
 * only there to say so before the round trip. Keep the two in step.
 */
export const MIN_PASSWORD_LENGTH = 6;

/**
 * The keys under the `auth.errors` namespace in messages/{de,en}.json.
 *
 * Auth failures are turned into one of these instead of showing the message
 * GoTrue returns: those are English-only and phrased for developers.
 */
export const AUTH_ERROR_KEYS = [
  "invalidCredentials",
  "emailRateLimit",
  "requestRateLimit",
  "weakPassword",
  "samePassword",
  "passwordTooShort",
  "passwordMismatch",
  "sessionExpired",
  "linkExpired",
  "inviteExpired",
  "signupDisabled",
  "emailNotConfirmed",
  "userBanned",
  "generic",
] as const;

export type AuthErrorKey = (typeof AUTH_ERROR_KEYS)[number];

/**
 * Guard for the `?error=` search param the auth route handlers redirect with.
 *
 * The value ends up in a `t()` lookup, and next-intl throws on a key it does
 * not know — so anything that did not come from us is discarded here.
 */
export function isAuthErrorKey(value: string | undefined): value is AuthErrorKey {
  return !!value && (AUTH_ERROR_KEYS as readonly string[]).includes(value);
}

/** GoTrue error codes we have a specific message for. */
const CODE_MESSAGES: Record<string, AuthErrorKey> = {
  invalid_credentials: "invalidCredentials",
  email_address_invalid: "invalidCredentials",
  user_not_found: "invalidCredentials",
  over_email_send_rate_limit: "emailRateLimit",
  over_request_rate_limit: "requestRateLimit",
  weak_password: "weakPassword",
  same_password: "samePassword",
  session_not_found: "sessionExpired",
  session_expired: "sessionExpired",
  bad_jwt: "sessionExpired",
  otp_expired: "linkExpired",
  flow_state_expired: "linkExpired",
  flow_state_not_found: "linkExpired",
  bad_code_verifier: "linkExpired",
  invite_not_found: "inviteExpired",
  signup_disabled: "signupDisabled",
  email_provider_disabled: "signupDisabled",
  email_not_confirmed: "emailNotConfirmed",
  user_banned: "userBanned",
};

/** Translate a caught auth failure into an `auth.errors.*` message key. */
export function authErrorKey(error: unknown): AuthErrorKey {
  if (!isAuthError(error)) return "generic";

  const byCode = error.code && CODE_MESSAGES[error.code];
  if (byCode) return byCode;

  // Older GoTrue responses, and a few endpoints still, carry only a status.
  if (error.status === 429) return "requestRateLimit";
  if (error.status === 401 || error.status === 403) return "sessionExpired";

  return "generic";
}
