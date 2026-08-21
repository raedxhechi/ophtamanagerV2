import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

/** Private bucket created in supabase/migrations/*_create_policy_images_bucket.sql. */
export const POLICY_IMAGE_BUCKET = "policy-images";

/** Mirrors the bucket's own allowed_mime_types, so a bad pick fails in the UI. */
export const POLICY_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

/** Mirrors the bucket's file_size_limit (5 MB). */
export const POLICY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** How long a minted read URL stays valid — one page view, with room to spare. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Where an office's policy image lives.
 *
 * Today every office is shown the same image, stored under `shared`. The
 * per-office key is already spelled out here: pass a `doctorOfficeId` and the
 * upload, the lookup and the fallback below all follow it — nothing else in the
 * feature has to change to go per-office.
 */
export function policyImagePath(doctorOfficeId?: string | null) {
  return doctorOfficeId ? `offices/${doctorOfficeId}` : "shared";
}

type Client = SupabaseClient<Database>;

/**
 * A signed URL for the policy image, or null when none has been uploaded.
 *
 * With a `doctorOfficeId` it prefers that office's own image and falls back to
 * the shared one; without, it goes straight to the shared image — which is the
 * only one that exists today, so the common path is a single request.
 */
export async function getPolicyImageUrl(
  client: Client,
  doctorOfficeId?: string | null
): Promise<string | null> {
  if (doctorOfficeId) {
    const own = await signPolicyImage(client, policyImagePath(doctorOfficeId));
    if (own) return own;
  }

  return signPolicyImage(client, policyImagePath());
}

/** Signs one exact object; a missing object is a null, not a throw. */
async function signPolicyImage(client: Client, path: string) {
  const { data, error } = await client.storage
    .from(POLICY_IMAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error) return null;
  return data.signedUrl;
}
