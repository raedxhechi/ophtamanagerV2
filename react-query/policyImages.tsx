'use client'

import { useMutation, useQuery } from '@tanstack/react-query'

import {
  getPolicyImage,
  removePolicyImage,
  uploadPolicyImage,
} from '@/api/browser'

import { queryClient } from './provider'

// Keyed by scope, not by office row: 'shared' is a real scope of its own today
// and stays one once offices can have their own image.
export const getPolicyImageKey = (doctorOfficeId?: string | null) => [
  'policyImages',
  doctorOfficeId ?? 'shared',
]

/**
 * The policy image for a scope. The URL it holds is signed and expires, so it
 * is refetched rather than cached indefinitely.
 */
export const usePolicyImage = (doctorOfficeId?: string | null) =>
  useQuery({
    queryKey: getPolicyImageKey(doctorOfficeId),
    queryFn: () => getPolicyImage(doctorOfficeId),
    staleTime: 5 * 60 * 1000,
  })

export const useUploadPolicyImage = (doctorOfficeId?: string | null) =>
  useMutation({
    mutationFn: (file: File) => uploadPolicyImage(file, doctorOfficeId),
    // The upload returns the stored image, so the cache is primed with it
    // instead of being invalidated and read back a second time.
    onSuccess: (image) =>
      queryClient.setQueryData(getPolicyImageKey(doctorOfficeId), image),
  })

export const useRemovePolicyImage = (doctorOfficeId?: string | null) =>
  useMutation({
    mutationFn: () => removePolicyImage(doctorOfficeId),
    onSuccess: () =>
      queryClient.setQueryData(getPolicyImageKey(doctorOfficeId), null),
  })
