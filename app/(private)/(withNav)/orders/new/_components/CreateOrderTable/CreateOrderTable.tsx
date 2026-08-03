'use client'
import { SubOrderInput } from './schema'
import { Medicine, PatientWithInsuranceCompany } from '@/types'

import { AvailableSubOrders } from './AvailableSubOrders/AvailableSubOrders'
import { AddedSuborders } from './AddedSuborders/AddedSuborder'
import { useEffect, useMemo, useState } from 'react'
import { useSearchPatientsInfinite } from '@/react-query/patients'

export interface CreateOrderTableProps {
  addedSubOrders: SubOrderInput[]
  onChange: (value: SubOrderInput[]) => void
  medicinesByCompany: Record<string, Medicine[]>
  medicineId: string
}

const patientToSubOrder = (patient: PatientWithInsuranceCompany, index: number) => ({
  number: index + 1,
  patientId: patient.id,
  dateOfBirth: patient.date_of_birth,
  fullName: `${patient.last_name} ${patient.first_name}`,
  ikNumber: patient.insurance_companies?.iknumber,
  leftEye: false,
  rightEye: false,
  invoice: undefined,
  insuranceCompany: patient.insurance_companies,
})

export const CreateOrderTable = ({
  addedSubOrders,
  onChange,
  medicinesByCompany,
  medicineId,
}: CreateOrderTableProps) => {
  const [search, setSearch] = useState('')

  // Server-side infinite scroll: newest patients first, searchText matches while
  // searching, 20 fetched per page as the user scrolls to the bottom.
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useSearchPatientsInfinite(search)

  const patients = useMemo(() => data?.pages.flat() ?? [], [data])

  const [availableSubOrders, setAvailableSubOrders] = useState<SubOrderInput[]>([])

  // Rebuild the available list from the fetched patients minus the ones already
  // added, preserving any in-progress eye/invoice edits on rows that remain.
  useEffect(() => {
    const addedIds = new Set(addedSubOrders.map(({ patientId }) => patientId))
    setAvailableSubOrders((prev) => {
      const prevById = new Map(prev.map((sub) => [sub.patientId, sub]))
      return patients
        .filter(({ id }) => !addedIds.has(id))
        .map((patient, index) => {
          const existing = prevById.get(patient.id)
          return existing ? { ...existing, number: index + 1 } : patientToSubOrder(patient, index)
        })
    })
  }, [patients, addedSubOrders])

  const handleAvailableSubOrderChange = (subOrder: SubOrderInput) => {
    setAvailableSubOrders((state) =>
      state.map((sub) => (sub.patientId === subOrder.patientId ? subOrder : sub))
    )
  }

  const handleAddedSubOrderChange = (subOrder: SubOrderInput) => {
    const newSubOrders = addedSubOrders.map((sub) => {
      return sub.patientId === subOrder.patientId ? subOrder : sub
    })
    onChange(newSubOrders)
  }

  const handleAddSubOrder = (patientId: string) => {
    const subOrderToAdd = availableSubOrders.find((sub) => sub.patientId === patientId)
    if (subOrderToAdd) {
      // The effect drops it from `available` once it lands in `addedSubOrders`.
      onChange([subOrderToAdd, ...addedSubOrders])
    }
  }

  const handleRemoveSubOrder = (patientId: string) => {
    // The effect re-adds it to `available` if it matches the current results.
    onChange(addedSubOrders.filter((sub) => sub.patientId !== patientId))
  }

  return (
    <>
      <AvailableSubOrders
        subOrders={availableSubOrders}
        onSubOrderChange={handleAvailableSubOrderChange}
        onAddSubOrder={handleAddSubOrder}
        medicineId={medicineId}
        medicinesByCompany={medicinesByCompany}
        search={search}
        onSearchChange={setSearch}
        onLoadMore={fetchNextPage}
        hasMore={hasNextPage}
        // Show the loading skeleton on the initial load too, not just paging.
        isFetchingMore={isFetchingNextPage || isLoading}
      />
      <AddedSuborders
        subOrders={addedSubOrders}
        onRemove={handleRemoveSubOrder}
        onSubOrderChange={handleAddedSubOrderChange}
      />
    </>
  )
}
