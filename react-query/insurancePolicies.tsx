'use client'

import { listPolicies } from '@/api/browser'
import { useQuery } from '@tanstack/react-query'

// `doctorOfficeId` scopes the policies for callers RLS doesn't (an admin
// ordering on an office's behalf); it's part of the key so switching offices
// doesn't reuse the previous office's coverage rules.
export const useListPolicies = (doctorOfficeId?: string) =>
  useQuery({
    queryKey: ['insurancePolicies', 'list', doctorOfficeId ?? null],
    queryFn: () => listPolicies(doctorOfficeId),
  })
