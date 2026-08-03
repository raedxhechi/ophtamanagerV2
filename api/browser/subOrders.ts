'use client'

import type { Suborder } from '@/types'

import { client } from './client'

const SUBORDER_SELECT = `
  *,
  patients (
    *,
    insurance_companies (*)
  ),
  orders (
    *,
    medicine (*)
  )
`

export const getSubOrder = async (id: string) => {
  const { data, error } = await client
    .from('suborders')
    .select(SUBORDER_SELECT)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as unknown as Suborder
}
