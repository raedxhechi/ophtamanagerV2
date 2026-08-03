'use client'

// NOTE: There is no `draft_orders` table in the Supabase migrations yet, so
// these can't be ported like the other tables. They throw on use so the gap is
// obvious rather than silently failing. Once a `draft_orders` table exists,
// implement these against it (see the Directus originals in ./directus.ts).

const NOT_IMPLEMENTED =
  'draftOrders are not available: no `draft_orders` table exists in the Supabase schema yet.'

export const listDraftOrders = async (_options?: any) => {
  throw new Error(NOT_IMPLEMENTED)
}

export const getDraftOrder = async (_id: string) => {
  throw new Error(NOT_IMPLEMENTED)
}

export const createDraftOrder = async (_data: any) => {
  throw new Error(NOT_IMPLEMENTED)
}

export const deleteDraftOrder = async (_id: string) => {
  throw new Error(NOT_IMPLEMENTED)
}
