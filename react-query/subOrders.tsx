'use client'

import { createSwap, getSubOrder, listSwapRelations, listSwaps } from '@/api/browser'
import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient } from './provider'

type Operation = 'list' | 'get' | 'create'

export const getSubOrderKey = (operation: Operation) => ['orders', operation]

export const useGetSubOrder = (id: string) =>
  useQuery({
    queryKey: ['subOrder', 'get', id],
    queryFn: () => {
      return getSubOrder(id)
    },
  })

// Keyed per original, so one suborder's swaps are never served from another's
// cache — and so creating a swap only refetches the drawer that is open.
export const getSwapsKey = (subOrderId: string) => ['subOrders', 'swaps', subOrderId]

/**
 * The swaps made out of one suborder. `enabled` keeps it from firing for every
 * row of the table: the drawer passes its open state, so the query runs only
 * for the suborder actually being looked at.
 */
export const useListSwaps = (subOrderId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: getSwapsKey(subOrderId ?? ''),
    queryFn: () => listSwaps(subOrderId!),
    enabled: enabled && !!subOrderId,
  })

export const useCreateSwap = () =>
  useMutation({
    mutationFn: createSwap,
    onSuccess: (_swap, { swappedFromId }) => {
      // The new row is a swap of this original, so only that list is stale. The
      // orders table itself is server-rendered, so the drawer follows up with a
      // router.refresh() — react-query holds no copy of it to invalidate.
      queryClient.invalidateQueries({ queryKey: getSwapsKey(swappedFromId) })
    },
  })

// Sorted so the key depends on which suborders are being marked, not on the
// order the table happened to list them in.
export const getSwapRelationsKey = (subOrderIds: string[], originalIds: string[]) => [
  'subOrders',
  'swapRelations',
  [...subOrderIds].sort().join(','),
  [...originalIds].sort().join(','),
]

/**
 * The swaps and originals needed to mark a list of suborders that spans orders
 * — the patients page. The orders page derives its marks from the rows it
 * already has and does not use this.
 */
export const useSwapRelations = (subOrderIds: string[], originalIds: string[]) =>
  useQuery({
    queryKey: getSwapRelationsKey(subOrderIds, originalIds),
    queryFn: () => listSwapRelations({ subOrderIds, originalIds }),
    enabled: subOrderIds.length > 0 || originalIds.length > 0,
  })
