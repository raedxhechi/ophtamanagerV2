'use client'

import type { InsuranceCompany } from '@/types'

import { client } from './client'

export const listInsuranceCompanies = async () => {
  const { data, error } = await client
    .from('insurance_companies')
    .select('*')
    .order('name')

  if (error) throw error
  return (data ?? []) as InsuranceCompany[]
}
