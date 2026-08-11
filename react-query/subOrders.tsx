'use client'

import { getSubOrder } from '@/api/browser'
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
