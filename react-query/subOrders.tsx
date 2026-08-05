'use client'

import { getSubOrder, listSubOrdersByPatients } from '@/api/browser'
import { useQuery } from '@tanstack/react-query'

type Operation = 'list' | 'get' | 'create'

export const getSubOrderKey = (operation: Operation) => ['orders', operation]

export const useGetSubOrder = (id: string) =>
  useQuery({
    queryKey: ['subOrder', 'get', id],
    queryFn: () => {
      return getSubOrder(id)
    },
  })

/**
 * The office's suborders grouped by patient id. Runs on the client once mounted
 * so it doesn't add to the patients page's initial load. `patientIds` only
 * gates the fetch (skip when there are no patients) and keeps the cache keyed to
 * the visible set — the query itself is RLS-scoped, not id-filtered.
 */
export const useSubOrdersByPatients = (patientIds: string[]) =>
  useQuery({
    queryKey: ['suborders', 'byPatients'],
    queryFn: () => listSubOrdersByPatients(),
    enabled: patientIds.length > 0,
  })
