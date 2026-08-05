'use client'

import { useMutation, useQuery } from '@tanstack/react-query'

import { getMyUserSettings, saveMyTableSettings } from '@/api/browser'
import type { TableSettings, TableSettingsKey } from '@/types'

import { queryClient } from './provider'

type Operation = 'me'

export const getUserSettingsKey = (operation: Operation) => [
  'userSettings',
  operation,
]

/**
 * The signed-in user's settings. Nothing outside this browser writes them, so
 * the cache is never stale — remounting a table (navigating back to the list)
 * reuses what's already there instead of refetching.
 *
 * Tables block their first render on this query, so it must not retry: the
 * default three attempts with backoff would leave the page empty for seconds
 * before falling back to the built-in defaults.
 */
export const useMyUserSettings = () =>
  useQuery({
    queryKey: getUserSettingsKey('me'),
    queryFn: () => getMyUserSettings(),
    staleTime: Infinity,
    retry: false,
  })

// The saved row comes back from the upsert, so the cache is primed with it
// directly rather than invalidated and refetched.
export const useSaveTableSettings = () =>
  useMutation({
    mutationFn: ({
      key,
      settings,
    }: {
      key: TableSettingsKey
      settings: TableSettings
    }) => saveMyTableSettings(key, settings),
    onSuccess: (data) =>
      queryClient.setQueryData(getUserSettingsKey('me'), data),
  })
