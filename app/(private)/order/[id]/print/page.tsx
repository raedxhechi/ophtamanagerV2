'use client'
import React from 'react'
import ReactDOM from 'react-dom'
import { PDFViewer } from '@react-pdf/renderer'

import { useGetOrder } from '@/react-query/orders'
import { OrderTickets } from './OrderTickets'
import { capitalize } from '@/lib/utils'

export default function PrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)

  const { data: order, isError, isPending } = useGetOrder(id)

  const items =
    order?.suborders
      .map((sub) => {
        const quantity = (!!sub.left_eye ? 1 : 0) + (!!sub.right_eye ? 1 : 0)
        const items: any[] = []
        if (!!sub.left_eye) {
          const left = {
            fullName: capitalize(sub.patient.last_name) + ' ' + capitalize(sub.patient.first_name),
            dateOfBirth: sub.patient.date_of_birth,
            label: 'L',
          }
          items.push(left)
        }
        if (!!sub.right_eye) {
          const right = {
            fullName: capitalize(sub.patient.last_name) + ' ' + capitalize(sub.patient.first_name ),
            dateOfBirth: sub.patient.date_of_birth,
            label: 'R',
          }
          items.push(right)
        }

        return items
      })
      .flat(Infinity) || []

  return (
    <div>
      {isPending && <p>Loading...</p>}
      {isError && <p>Error loading order.</p>}
      {order && (
        <PDFViewer style={{ width: '100%', height: '100vh' }}>
          <OrderTickets items={items} />
        </PDFViewer>
      )}
    </div>
  )
}
