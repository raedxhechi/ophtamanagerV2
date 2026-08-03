import { Separator } from '@/components/ui/separator'
import { DataTable } from '../table/create-order-table'
import { useAddedSubOrdersColums } from './useColumns'
import { AddedSubOrder } from './schema'
import { useState } from 'react'
import { EditSubOrderModal } from '../EditSubOrderModal'
import { SubOrderInput } from '../schema'

export interface AddedSubordersProps {
  subOrders: SubOrderInput[]
  onRemove: (patientId: string) => void
  onSubOrderChange: (subOrder: SubOrderInput) => void
}
export const AddedSuborders = ({ subOrders, onRemove, onSubOrderChange }: AddedSubordersProps) => {
  const columns = useAddedSubOrdersColums()
  const [subOrderToEdit, setSubOrderToEdit] = useState<SubOrderInput | null | undefined>(undefined)

  const handleSelectPatientToEdit = (patientId: string) => {
    setSubOrderToEdit(subOrders.find((sub) => sub.patientId === patientId))
  }

  const handleCloseEditModal = (open: boolean) => {
    if (!open) {
      setSubOrderToEdit(undefined)
    }
  }

  const handleConfirmEdit = (subOrder: SubOrderInput) => {
    console.log({ subOrder })
    onSubOrderChange(subOrder)
    setSubOrderToEdit(undefined)
  }

  const handleRemoveSubOrder = (patientId: string) => {
    console.log(`to remove ${patientId}`)
    onRemove(patientId)
  }

  const addedSubOrders: AddedSubOrder[] = subOrders.map((subOrder, index) => ({
    ...subOrder,
    added: true,
    editPatient: handleSelectPatientToEdit,
    removePatient: handleRemoveSubOrder,
    number: index + 1,
  }))

  return addedSubOrders.length > 0 ? (
    <>
      <Separator className='my-[20px]' />
      <DataTable data={addedSubOrders} columns={columns} disableSearch />
      {!!subOrderToEdit && (
        <EditSubOrderModal
          open={!!subOrderToEdit}
          setOpen={handleCloseEditModal}
          patient={subOrderToEdit}
          handleConfirmEdit={handleConfirmEdit}
        />
      )}
    </>
  ) : null
}
