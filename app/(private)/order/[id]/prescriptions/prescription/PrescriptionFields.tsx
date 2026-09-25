import React from 'react'
import { View } from '@react-pdf/renderer'

import type { OrderSubOrder, OrderWithSubOrders } from '@/types'
import { capitalize } from '@/lib/utils'

import { Field, LAYER, Stamp, eyesLabel, joinParts, shortDate } from './shared'

// The filled-in half of the Muster 16 prescription: only the order's and the
// patient's data, placed where the practice's typewriter-style print lands on
// the form. No lines or labels here — those are PrescriptionTemplate — so this
// layer on its own prints straight onto pre-printed blanks.
//
// Coordinates are PDF points from the page's top-left, measured off the same
// scan as the template.

export function PrescriptionFields({
  order,
  suborder,
}: {
  order: OrderWithSubOrders
  suborder: OrderSubOrder
}) {
  const patient = suborder.patient
  const insurance = patient?.insurance_companies
  const office = order.doctor_office
  const doctor = office?.default_doctor

  return (
    <View style={LAYER}>
      {/* Krankenkasse */}
      <Field x={29} y={27}>
        {insurance?.name}
      </Field>

      {/* Name, Vorname, Anschrift — geb. am */}
      <Field x={29} y={50}>
        {patient?.last_name && capitalize(patient.last_name)}
      </Field>
      <Field x={29} y={62}>
        {patient?.first_name && capitalize(patient.first_name)}
      </Field>
      <Field x={243.7} y={62} alignRight>
        {shortDate(patient?.date_of_birth)}
      </Field>
      <Field x={29} y={74}>
        {joinParts(patient?.street, patient?.house_number)}
      </Field>
      <Field x={29} y={85.5}>
        {patient?.zipcode || patient?.city ? joinParts('D', patient?.zipcode, patient?.city) : null}
      </Field>

      {/* Kostenträgerkennung, Versicherten-Nr. */}
      <Field x={30} y={108}>
        {insurance?.iknumber}
      </Field>
      <Field x={106.7} y={108}>
        {patient?.insurance_number}
      </Field>

      {/* Betriebsstätten-Nr., Arzt-Nr., Datum — the row's three boxes, left to
          right. The BSNR starts at the same x as the Kostenträgerkennung above
          it: they share the column the patient block's first divider opens. */}
      <Field x={30} y={131.7}>
        {office?.bsnr}
      </Field>
      <Field x={104.7} y={131.7}>
        {doctor?.doctor_number}
      </Field>
      <Field x={184.7} y={131.7}>
        {shortDate(order.created_at)}
      </Field>

      {/* Rp. */}
      <Field x={30} y={162} size={10}>
        {order.medicine?.name}
      </Field>
      <Field x={30} y={172} size={10}>
        {`Zur 1x Injektion durch den Arzt`}
      </Field>
      <Field x={30} y={182} size={10}>
        {joinParts('OP-Tag:', shortDate(order.application_date), eyesLabel(suborder))}
      </Field>
      <Field x={30} y={191} size={10}>
        {'*'.repeat(34)}
      </Field>

      {/* Vertragsarztstempel */}
      <Stamp order={order} left={250} top={180} width={180} />
    </View>
  )
}
