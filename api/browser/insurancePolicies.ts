'use client'

import type { InsurancePolicyWithRelations } from '@/types'

import { client } from './client'

// Directus exposed policies with flat `medicines` / `insuranceCompanies` arrays
// of junction rows. In Supabase those are the two junction tables, so we embed
// through them: each policy comes back with its linked medicines and insurance
// companies nested under the junction relations.
const POLICY_SELECT = `
  *,
  insurance_policy_medicines (
    medicine (*)
  ),
  insurance_policy_insurance_companies (
    insurance_companies (*)
  )
`

export const listPolicies = async () => {
  const { data, error } = await client
    .from('insurance_policy')
    .select(POLICY_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as InsurancePolicyWithRelations[]
}
