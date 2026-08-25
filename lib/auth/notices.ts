/**
 * The keys under the `auth.notices` namespace in messages/{de,en}.json.
 *
 * A notice is not a failure. `?error=` says something went wrong; `?message=`
 * explains why you are looking at this screen at all — which is a different
 * tone, a different colour, and a different place on the page.
 */
export const AUTH_NOTICE_KEYS = ["adminRedirected"] as const;

export type AuthNoticeKey = (typeof AUTH_NOTICE_KEYS)[number];

/**
 * The `?message=` values other deployments send, mapped onto our own keys.
 *
 * The wire value is fixed by whoever redirects — the live app's proxy sends
 * `admin_redirected` — while the message keys are camelCase like every other
 * key in messages/. Mapping keeps that seam in one place instead of leaking a
 * foreign naming convention into the translation files, the same way
 * `errors.ts` maps GoTrue's codes onto its own.
 */
const NOTICE_PARAMS: Record<string, AuthNoticeKey> = {
  admin_redirected: "adminRedirected",
};

/**
 * Resolve the `?message=` search param to a notice key, or null.
 *
 * The value ends up in a `t()` lookup and next-intl throws on a key it does not
 * know, so anything that did not come from us is discarded here rather than
 * crashing the login page. That matters more than usual for this param: it
 * arrives from a different deployment, so nothing about it is under this
 * codebase's control.
 */
export function authNoticeKey(
  value: string | undefined
): AuthNoticeKey | null {
  if (!value) return null;
  return NOTICE_PARAMS[value] ?? null;
}
