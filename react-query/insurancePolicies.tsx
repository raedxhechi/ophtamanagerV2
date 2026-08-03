'use client'

import { listPolicies } from '@/api/browser'
import { useQuery } from '@tanstack/react-query'

export const useListPolicies = () =>
  useQuery({
    queryKey: ['insurancePolicies', 'list'],
    queryFn: (options?: any) => {
      return listPolicies()
    },
  })
