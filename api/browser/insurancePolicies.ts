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

/**
 * `doctorOfficeId` is only needed by callers RLS doesn't already scope: an
 * office user sees their own office's policies either way, but an admin sees
 * every office's, and the union of them would decide which medicines a public
 * insurer covers — the rule the order form enforces — from the wrong office.
 */
export const listPolicies = async (doctorOfficeId?: string) => {
  let query = client
    .from('insurance_policy')
    .select(POLICY_SELECT)
    .order('created_at', { ascending: false })

  if (doctorOfficeId) {
    query = query.eq('doctor_office_id', doctorOfficeId)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as unknown as InsurancePolicyWithRelations[]
}
