'use client'

import {
  listOrders,
  createOrder,
  listDraftOrders,
  getDraftOrder,
  createDraftOrder,
  deleteDraftOrder,
} from '@/api/browser'
import { useMutation, useQuery } from '@tanstack/react-query'
import { queryClient } from './provider'
import { de } from 'date-fns/locale'

type Operation = 'list' | 'get' | 'create' | 'delete'

export const getDraftOrdersKey = (operation: Operation) => ['draftOrders', operation]

export const useListDraftOrders = () =>
  useQuery({
    queryKey: getDraftOrdersKey('list'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: (options?: any) => {
      return listDraftOrders(options)
    },
  })

export const useGetDraftOrder = (id?: string | null) =>
  useQuery({
    queryKey: [...getDraftOrdersKey('get'), id],
    queryFn: () => getDraftOrder(id as string),
    enabled: !!id,
  })

export const useCreateDraftOrder = () =>
  useMutation({
    mutationFn: createDraftOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getDraftOrdersKey('list') })
    },
  })

export const useDeleteDraftOrder = () =>
  useMutation({
    mutationFn: deleteDraftOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getDraftOrdersKey('list') })
    },
  })
