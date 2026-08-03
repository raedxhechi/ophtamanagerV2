'use client'
import React from 'react'
import ReactDOM from 'react-dom'
import { PDFViewer } from '@react-pdf/renderer'

import { capitalize } from '@/lib/utils'
import { useGetSubOrder } from '@/react-query/subOrders'
import { OrderTickets } from '../../../order/[id]/print/OrderTickets'

export default function SubOrderPrint({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)

  const { data: subOrder, isError, isPending, error } = useGetSubOrder(id)

  const items: any[] = []
  if (!!subOrder?.left_eye) {
    const left = {
      fullName:
        capitalize(subOrder?.patient.last_name) + ' ' + capitalize(subOrder?.patient.first_name),
      dateOfBirth: subOrder?.patient.date_of_birth,
      label: 'L',
    }
    items.push(left)
  }
  if (!!subOrder?.right_eye) {
    const right = {
      fullName:
        capitalize(subOrder?.patient.last_name) + ' ' + capitalize(subOrder?.patient.first_name),
      dateOfBirth: subOrder?.patient.date_of_birth,
      label: 'R',
    }
    items.push(right)
  }

  //   const item = {
  //     fullName:
  //       capitalize(subOrder?.patient.lastName) + ' ' + capitalize(subOrder?.patient.firstName),
  //     dateOfBirth: subOrder?.patient.dateOfBirth,
  //     label: !!subOrder?.leftEye ? 'L' : !!subOrder?.rightEye ? 'R' : '',
  //   }

  return (
    <div>
      {isPending && <p>Loading...</p>}
      {isError && !subOrder && <p>{JSON.stringify(error)}</p>}
      {!!subOrder && (
        <PDFViewer style={{ width: '100%', height: '100vh' }}>
          <OrderTickets items={items} />
        </PDFViewer>
      )}
    </div>
  )
}
