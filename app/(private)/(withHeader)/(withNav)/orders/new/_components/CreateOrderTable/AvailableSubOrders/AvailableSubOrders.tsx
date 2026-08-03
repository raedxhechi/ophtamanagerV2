import { Medicine } from '@/types'
import { AvailableSubOrder, EyeClickedValue } from './schema'
import { DataTable } from '../table/create-order-table'
import { useAvailableSubOrdersColumns } from './useColumns'
import { SubOrderInput } from '../schema'

export interface PatientListProps {
  subOrders: SubOrderInput[]
  onSubOrderChange: (subOrder: SubOrderInput) => void
  onAddSubOrder: (patientId: string) => void
  medicinesByCompany: Record<string, Medicine[]>
  medicineId: string
  // Server-side search term + setter (drives the fetched patient list).
  search?: string
  onSearchChange?: (value: string) => void
  // Infinite scroll: fetch the next page, whether more exist, and loading state.
  onLoadMore?: () => void
  hasMore?: boolean
  isFetchingMore?: boolean
}

export const AvailableSubOrders = ({
  subOrders,
  onSubOrderChange,
  onAddSubOrder,
  medicinesByCompany,
  medicineId,
  search,
  onSearchChange,
  onLoadMore,
  hasMore,
  isFetchingMore,
}: PatientListProps) => {
  const columns = useAvailableSubOrdersColumns()

  const handleEyeTriggered = ({ leftEye, rightEye, id }: EyeClickedValue) => {
    const subOrderToUpdate = subOrders.find((sub) => sub.patientId === id)
    if (subOrderToUpdate) {
      const updatedSubOrder = { ...subOrderToUpdate, leftEye, rightEye }
      onSubOrderChange(updatedSubOrder)
    }
  }

  const handleAddSubOrder = (patientId: string) => {
    console.log(`to add ${patientId}`)
    onAddSubOrder(patientId)
  }

  const handleInvoiceSelect = ({ id, invoice }: { id: string; invoice: string }) => {
    const subOrderToUpdate = subOrders.find((sub) => sub.patientId === id)
    if (subOrderToUpdate) {
      const updatedSubOrder = { ...subOrderToUpdate, invoice }
      onSubOrderChange(updatedSubOrder)
    }
  }

  const availableSubOrders: AvailableSubOrder[] = subOrders.map((sub) => ({
    ...sub,
    toggleEye: handleEyeTriggered,
    selectInvoice: handleInvoiceSelect,
    selectPatient: handleAddSubOrder,
    disabled:
      sub.insuranceCompany && medicineId
        ? // Public ('Gesetzlich') insurers only allow medicines covered by a policy.
          sub.insuranceCompany.insurance_type === 'Gesetzlich' &&
          !medicinesByCompany[sub.insuranceCompany.id]?.map((med) => med.id).includes(medicineId)
        : true,
  }))

  return (
    <DataTable
      data={availableSubOrders}
      columns={columns}
      search={search}
      onSearchChange={onSearchChange}
      onLoadMore={onLoadMore}
      hasMore={hasMore}
      isFetchingMore={isFetchingMore}
    />
  )
}
