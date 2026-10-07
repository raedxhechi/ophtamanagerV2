import React from 'react'
import { View } from '@react-pdf/renderer'

import type { OrderSubOrder, OrderWithSubOrders } from '@/types'
import { capitalize } from '@/lib/utils'

import { Field, LAYER, Stamp, eyesLabel, joinParts, shortDate } from './shared'

// The filled-in half of the practice-pad prescription (LetterheadTemplate). The
// pad has no insurance fields, so none are printed; the address goes without
// the "D" prefix, and the Rp. lines print bold and smaller than on Muster 16.
//
// Coordinates are PDF points from the page's top-left, measured off the scan.

export function LetterheadFields({
  order,
  suborder,
}: {
  order: OrderWithSubOrders
  suborder: OrderSubOrder
}) {
  const patient = suborder.patient
  const doctor = order.doctor_office?.default_doctor

  return (
    <View style={LAYER}>
      {/* Name, Vorname, Anschrift — geb. am */}
      <Field x={26.7} y={64.7}>
        {patient?.last_name && capitalize(patient.last_name)}
      </Field>
      <Field x={26.7} y={76.3}>
        {patient?.first_name && capitalize(patient.first_name)}
      </Field>
      <Field x={242.3} y={76.3} alignRight>
        {shortDate(patient?.date_of_birth)}
      </Field>
      <Field x={26.7} y={88.3}>
        {joinParts(patient?.street, patient?.house_number)}
      </Field>
      <Field x={26.7} y={100.3}>
        {joinParts(patient?.zipcode, patient?.city)}
      </Field>

      {/* Arzt-Nr., Datum */}
      <Field x={99} y={148.3}>
        {doctor?.doctor_number}
      </Field>
      <Field x={177.7} y={148.3}>
        {shortDate(order.created_at)}
      </Field>

      {/* Rp. */}
      <Field x={26.7} y={185} size={9.7} bold>
        {order.medicine?.name}
      </Field>
      <Field x={26.7} y={194.5} size={9.7} bold>
        {`Zur 1x Injektion durch den Arzt`}
      </Field>
      <Field x={26.7} y={204.5} size={9.7} bold>
        {joinParts('OP-Tag:', shortDate(order.application_date), eyesLabel(suborder))}
      </Field>
      <Field x={26.7} y={224.5} size={10} bold>
        {'*'.repeat(34)}
      </Field>

      {/* Stamp */}
      <Stamp order={order} left={243} top={196} width={147} />
    </View>
  )
}
