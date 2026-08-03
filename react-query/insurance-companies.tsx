'use client'

import { listInsuranceCompanies } from '@/api/browser'
import { useQuery } from '@tanstack/react-query'

export const useListInsuranceCompanies = (enabled = true) =>
  useQuery({
    queryKey: ['insuranceCompanies', 'list'],
    queryFn: (options?: any) => {
      return listInsuranceCompanies()
    },
    enabled,
  })
