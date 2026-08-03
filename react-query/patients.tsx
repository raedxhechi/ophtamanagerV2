'use client'

import {
  addPatient,
  updatePatient,
  listPatients,
  listPatientsPage,
  searchPatients,
} from '@/api/browser'
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
} from '@tanstack/react-query'
import { queryClient } from './provider'

type Operation = 'list' | 'get' | 'create' | 'update'

export const getPatientsKey = (operation: Operation) => ['patients', operation]

// `enabled` lets callers defer the (expensive, full-collection) fetch until it's
// actually needed — e.g. only when the "export all patients" modal is open.
export const useListPatients = (enabled = true) =>
  useQuery({
    queryKey: getPatientsKey('list'),
    queryFn: (options?: any) => {
      return listPatients()
    },
    enabled,
  })

export const useListPatientsPage = (page: number, pageSize: number, search = '') =>
  useQuery({
    queryKey: [...getPatientsKey('list'), page, pageSize, search],
    queryFn: () => listPatientsPage(page, pageSize, search),
    // Keep the previous page visible while the next one loads.
    placeholderData: keepPreviousData,
  })

// Number of patients fetched per page in the order form's picker.
export const PATIENTS_PICKER_PAGE_SIZE = 20

// Infinite scroll for the order form's patient picker.
export const useSearchPatientsInfinite = (search = '') =>
  useInfiniteQuery({
    queryKey: [...getPatientsKey('list'), 'search-infinite', search],
    queryFn: ({ pageParam }) => searchPatients(search, pageParam, PATIENTS_PICKER_PAGE_SIZE),
    initialPageParam: 1,
    // If the last page came back full, there may be more.
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PATIENTS_PICKER_PAGE_SIZE ? allPages.length + 1 : undefined,
    // Keep previous results visible while a new search loads.
    placeholderData: keepPreviousData,
  })

export const useCreatePatient = () =>
  useMutation({
    mutationFn: addPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getPatientsKey('list') })
    },
  })

export const useUpdatePatient = () =>
  useMutation({
    mutationFn: updatePatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getPatientsKey('list') })
    },
  })
