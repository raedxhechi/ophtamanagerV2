'use client'

import { listOrders, createOrder, getOrder, getSubOrder } from '@/api/browser'
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
