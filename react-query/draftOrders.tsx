'use client'

import {
  listDraftOrders,
  getDraftOrder,
  createDraftOrder,
  updateDraftOrder,
  deleteDraftOrder,
} from '@/api/browser'
import { useMutation, useQuery } from '@tanstack/react-query'
import { queryClient } from './provider'

import type { CreateDraftOrderInput } from '@/types'

type Operation = 'list' | 'get' | 'create' | 'update' | 'delete'

export const getDraftOrdersKey = (operation: Operation) => ['draftOrders', operation]

// Every mutation touches the list and may touch a single draft, so both are
// invalidated together.
const invalidateDraftOrders = () => {
  queryClient.invalidateQueries({ queryKey: getDraftOrdersKey('list') })
  queryClient.invalidateQueries({ queryKey: getDraftOrdersKey('get') })
}

export const useListDraftOrders = () =>
  useQuery({
    queryKey: getDraftOrdersKey('list'),
    queryFn: () => listDraftOrders(),
  })

export const useGetDraftOrder = (id?: string | null) =>
  useQuery({
    queryKey: [...getDraftOrdersKey('get'), id],
    queryFn: () => getDraftOrder(id as string),
    enabled: !!id,
  })

export const useCreateDraftOrder = () =>
  useMutation({
    mutationFn: (data: CreateDraftOrderInput) => createDraftOrder(data),
    onSuccess: invalidateDraftOrders,
  })

export const useUpdateDraftOrder = () =>
  useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateDraftOrderInput }) =>
      updateDraftOrder(id, data),
    onSuccess: invalidateDraftOrders,
  })

export const useDeleteDraftOrder = () =>
  useMutation({
    mutationFn: (id: string) => deleteDraftOrder(id),
    onSuccess: invalidateDraftOrders,
  })
