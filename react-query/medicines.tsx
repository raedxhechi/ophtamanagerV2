'use client'

import { listMedicines } from '@/api/browser'
import { useQuery } from '@tanstack/react-query'

export const useListMedicines = () =>
  useQuery({
    queryKey: ['medicines', 'list'],
    queryFn: (options?: any) => {
      return listMedicines()
    },
  })
