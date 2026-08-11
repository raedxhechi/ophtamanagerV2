'use client'

import type { TableSettings, TableSettingsKey, UserSettings } from '@/types'
import type { TablesInsert } from '@/types/supabase'

import { client } from './client'

const getCurrentUserId = async () => {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

/**
 * The signed-in user's settings row, or null if they've never saved any. RLS
 * already limits ordinary users to their own row, but the id is filtered on
 * explicitly so an admin — who can read every row — still gets their own.
 */
export const getMyUserSettings = async () => {
  const userId = await getCurrentUserId()

  const { data, error } = await client
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data as UserSettings | null
}

/**
 * Write one table's column settings, creating the row on first save. Only the
 * named column is sent, so saving the orders table doesn't clobber the patients
 * table's settings. `user_id` is passed rather than left to the auth.uid()
 * default because the upsert needs its conflict target in the payload.
 */
export const saveMyTableSettings = async (
  key: TableSettingsKey,
  settings: TableSettings
) => {
  const userId = await getCurrentUserId()

  const payload: TablesInsert<'user_settings'> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  }
  payload[key] = settings

  const { data, error } = await client
    .from('user_settings')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw error
  return data as UserSettings
}
