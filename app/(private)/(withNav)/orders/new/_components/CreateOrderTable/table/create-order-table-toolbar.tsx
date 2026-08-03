'use client'

import * as React from 'react'
import { Table } from '@tanstack/react-table'
import { Input } from '@/components/ui/input'
import { useTranslation } from 'react-i18next'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  // Present in server-side search mode: the current term and a debounced setter.
  search?: string
  onSearchChange?: (value: string) => void
}

export function DataTableToolbar<TData>({
  table,
  search,
  onSearchChange,
}: DataTableToolbarProps<TData>) {
  const { t } = useTranslation()

  const serverSearch = onSearchChange !== undefined

  // Local input value so typing stays responsive while the query is debounced.
  const [searchValue, setSearchValue] = React.useState(search ?? '')
  const inputRef = React.useRef<HTMLInputElement>(null)
  // Ref'd callback so a changing onSearchChange identity can't reset the timer.
  const onSearchChangeRef = React.useRef(onSearchChange)
  onSearchChangeRef.current = onSearchChange
  // The last term we sent (or received from the parent while idle).
  const lastSentRef = React.useRef(search ?? '')

  // Sync from the parent only while the user is NOT typing — syncing
  // unconditionally would overwrite in-progress input and eat keystrokes.
  React.useEffect(() => {
    if (!serverSearch) return
    if (document.activeElement === inputRef.current) return
    setSearchValue(search ?? '')
    lastSentRef.current = search ?? ''
  }, [search, serverSearch])

  // Debounce so we don't fire a request on every keystroke.
  React.useEffect(() => {
    if (!serverSearch) return
    if (searchValue === lastSentRef.current) return
    const timeout = setTimeout(() => {
      lastSentRef.current = searchValue
      onSearchChangeRef.current?.(searchValue)
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchValue, serverSearch])

  const value = serverSearch
    ? searchValue
    : ((table.getColumn('fullName')?.getFilterValue() as string) ?? '')

  const handleChange = (next: string) => {
    if (serverSearch) {
      setSearchValue(next)
    } else {
      table.getColumn('fullName')?.setFilterValue(next)
    }
  }

  return (
    <div className='flex items-start w-full'>
      <div className='flex flex-1 w-full'>
        <Input
          ref={inputRef}
          placeholder={t('component.PatientTableToolbar.searchInput')}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          className='h-10 w-full bg-white'
        />
      </div>
    </div>
  )
}
