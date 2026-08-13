'use client'

import {
  POLICY_IMAGE_BUCKET,
  POLICY_IMAGE_MAX_BYTES,
  POLICY_IMAGE_MIME_TYPES,
  getPolicyImageUrl,
  policyImagePath,
} from '@/lib/policyImage'

import { client } from './client'

export type PolicyImage = {
  /** Signed URL, valid for about an hour. */
  url: string
  /** When the file was last written, for the admin screen. */
  updatedAt: string | null
}

/**
 * The policy image currently in force, or null if none was ever uploaded.
 *
 * The upload goes straight from the browser to storage rather than through a
 * server action: a server action would have to carry the file in its request
 * body (1 MB by default) and re-check the caller, while the bucket's RLS
 * policies already say only admins may write.
 */
export const getPolicyImage = async (
  doctorOfficeId?: string | null
): Promise<PolicyImage | null> => {
  const url = await getPolicyImageUrl(client, doctorOfficeId)
  if (!url) return null

  return { url, updatedAt: await getPolicyImageUpdatedAt(doctorOfficeId) }
}

/** Replaces whatever is there — the key is fixed, so there is one image per scope. */
export const uploadPolicyImage = async (
  file: File,
  doctorOfficeId?: string | null
): Promise<PolicyImage> => {
  assertUploadable(file)

  const { error } = await client.storage
    .from(POLICY_IMAGE_BUCKET)
    .upload(policyImagePath(doctorOfficeId), file, {
      upsert: true,
      contentType: file.type,
    })

  if (error) throw error

  const image = await getPolicyImage(doctorOfficeId)
  if (!image) throw new Error('The image was uploaded but could not be read back.')
  return image
}

export const removePolicyImage = async (doctorOfficeId?: string | null) => {
  const { error } = await client.storage
    .from(POLICY_IMAGE_BUCKET)
    .remove([policyImagePath(doctorOfficeId)])

  if (error) throw error
}

/**
 * The bucket rejects an oversized or wrong-typed file on its own, but only
 * after the whole thing has been sent and with a message written for an API
 * caller, so the same limits are checked here first.
 */
export const assertUploadable = (file: File) => {
  if (!(POLICY_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new Error('Pick a PNG, JPEG or WebP image.')
  }
  if (file.size > POLICY_IMAGE_MAX_BYTES) {
    throw new Error('The image must be 5 MB or smaller.')
  }
}

/** Storage keeps no metadata endpoint for a single object, so list its folder. */
const getPolicyImageUpdatedAt = async (doctorOfficeId?: string | null) => {
  const path = policyImagePath(doctorOfficeId)
  const slash = path.lastIndexOf('/')
  const folder = slash === -1 ? '' : path.slice(0, slash)
  const name = slash === -1 ? path : path.slice(slash + 1)

  const { data, error } = await client.storage
    .from(POLICY_IMAGE_BUCKET)
    .list(folder, { search: name, limit: 1 })

  if (error) return null
  const entry = data?.find((item) => item.name === name)
  return entry?.updated_at ?? entry?.created_at ?? null
}
