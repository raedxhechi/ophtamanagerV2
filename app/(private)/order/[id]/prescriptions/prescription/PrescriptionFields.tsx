import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'

import type { OrderSubOrder, OrderWithSubOrders } from '@/types'
import { capitalize } from '@/lib/utils'

import { PAGE_HEIGHT, PAGE_WIDTH } from './PrescriptionTemplate'

// The filled-in half of the prescription: only the order's and the patient's
// data, placed where the practice's typewriter-style print lands on the form.
// No lines or labels here — those are PrescriptionTemplate — so this layer on
// its own prints straight onto pre-printed blanks.
//
// Coordinates are PDF points from the page's top-left, measured off the same
// scan as the template. `y` is the top of the text box: roughly the baseline
// minus 9pt for Courier 12.

const FONT = { fontFamily: 'Courier', fontSize: 12, lineHeight: 1 } as const
const STAMP_FONT = { fontFamily: 'Helvetica', fontSize: 8.5, lineHeight: 1 } as const

type FieldProps = {
  x: number
  y: number
  children?: string | null
  /** Right-align: the text ends at x instead of starting there. */
  alignRight?: boolean
  /** The Rp. lines print smaller than the header fields: 10pt against 12. */
  size?: number
}

const RIGHT_BOX = 120

const Field = ({ x, y, children, alignRight, size = FONT.fontSize }: FieldProps) =>
  children ? (
    <Text
      style={{
        ...FONT,
        fontSize: size,
        position: 'absolute',
        top: y,
        ...(alignRight ? { left: x - RIGHT_BOX, width: RIGHT_BOX, textAlign: 'right' } : { left: x }),
      }}
    >
      {children}
    </Text>
  ) : null

// The form prints short dates: 30.04.26.
const shortDate = (value?: string | null) => {
  if (!value) return null
  try {
    return format(parseISO(value), 'dd.MM.yy')
  } catch {
    return null
  }
}

const joinParts = (...parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(' ') || null

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

  // Quantity is a per-eye count, as everywhere else: both eyes count two.
  const quantity = (suborder.left_eye ? 1 : 0) + (suborder.right_eye ? 1 : 0)
  const eyes = [suborder.right_eye && 'RA', suborder.left_eye && 'LA'].filter(Boolean).join('+')

  // The practice stamp, printed in place of the rubber one. Empty lines are
  // skipped so the block closes up instead of leaving gaps.
  const stampLines = [
    joinParts(doctor?.first_name, doctor?.last_name),
    office?.name,
    joinParts(office?.street, office?.house_number),
    office?.phone_number ? `Tel.: ${office.phone_number}` : null,
    joinParts(office?.zipcode, office?.city),
  ].filter(Boolean)

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT }}>
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

      {/* Arzt-Nr., Datum */}
      <Field x={101.7} y={131.7}>
        {doctor?.doctor_number}
      </Field>
      <Field x={184.7} y={131.7}>
        {shortDate(order.created_at)}
      </Field>

      {/* Rp. */}
      <Field x={30} y={162} size={10}>
        {order.medicine?.name}
      </Field>
      {/* <Field x={30} y={172} size={10}>
        {`Zur ${quantity}x Injektion durch den Arzt`}
      </Field> */}
      <Field x={30} y={182} size={10}>
        {joinParts('OP-Tag:', shortDate(order.application_date), eyes)}
      </Field>
      <Field x={30} y={191} size={10}>
        {'*'.repeat(34)}
      </Field>

      {/* Vertragsarztstempel */}
      {stampLines.map((line, i) => (
        <Text
          key={i}
          style={{
            ...STAMP_FONT,
            position: 'absolute',
            left: 250,
            width: 180,
            top: 180 + i * 11,
            textAlign: 'center',
          }}
        >
          {line}
        </Text>
      ))}
    </View>
  )
}
