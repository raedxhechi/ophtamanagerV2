'use client'

import type { Medicine } from '@/types'

import { client } from './client'

// Note: in the Directus schema medicines carried a direct `insuranceCompanies`
// relation. In Supabase that link goes through `insurance_policy` (see
// insurancePolicies), so this just returns the medicines themselves.
export const listMedicines = async () => {
  const { data, error } = await client
    .from('medicine')
    .select('*')
    .order('name')

  if (error) throw error
  return (data ?? []) as Medicine[]
}
