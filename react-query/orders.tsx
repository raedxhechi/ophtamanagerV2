'use client'

import { listOrders, listOrdersPage, createOrder, getOrder, OrdersFilters } from '@/api/browser'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { queryClient } from './provider'

type Operation = 'list' | 'get' | 'create'

export const getOrdersKey = (operation: Operation) => ['orders', operation]

export const useListOrders = () =>
  useQuery({
    queryKey: getOrdersKey('list'),
    queryFn: (options?: any) => {
      return listOrders()
    },
  })

export const useListOrdersPage = (page: number, pageSize: number, filters: OrdersFilters = {}) =>
  useQuery({
    queryKey: [...getOrdersKey('list'), page, pageSize, filters],
    queryFn: () => listOrdersPage(page, pageSize, filters),
    // Keep the previous page visible while the next one loads.
    placeholderData: keepPreviousData,
  })

export const useCreateOrder = () =>
  useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getOrdersKey('list') })
    },
  })

export const useGetOrder = (id: string) =>
  useQuery({
    queryKey: ['orders', 'get', id],
    queryFn: () => {
      return getOrder(id)
    },
  })
