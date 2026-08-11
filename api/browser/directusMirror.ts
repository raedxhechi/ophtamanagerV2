'use client'

/**
 * Ask the server to mirror a just-created row into the legacy Directus backend
 * (see `app/api/directus-mirror/route.ts` and `directus/mirror.ts`).
 *
 * Deliberately fire-and-forget: the Supabase row is already committed by the
 * time this is called, so the create must not be held up — or undone — by
 * whatever Directus does next. Nothing here can throw into the caller, and the
 * response is not waited on.
 *
 * `keepalive` keeps the request in flight when the form redirects immediately
 * after saving, which is exactly what both create flows do.
 */
export const mirrorToDirectus = (type: 'patient' | 'order', id: string) => {
  try {
    void fetch('/api/directus-mirror', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, id }),
      credentials: 'same-origin',
      keepalive: true,
    }).catch((error) => {
      console.warn(`Directus mirror for ${type} ${id} could not be requested:`, error)
    })
  } catch (error) {
    console.warn(`Directus mirror for ${type} ${id} could not be requested:`, error)
  }
}
