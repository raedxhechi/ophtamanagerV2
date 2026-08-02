import { createDirectus, rest, staticToken } from "@directus/sdk";

/**
 * Directus client for server-side use only. Uses the admin static token, which
 * must never reach the browser — only import this from server code.
 */
export function createDirectusServerClient() {
  const url = process.env.DIRECTUS_API_URL;
  const token = process.env.DIRECTUS_ADMIN_STATIC_TOKEN;
  if (!url || !token) {
    throw new Error(
      "DIRECTUS_API_URL or DIRECTUS_ADMIN_STATIC_TOKEN is not set."
    );
  }
  return createDirectus(url).with(staticToken(token)).with(rest());
}
