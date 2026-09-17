import React from 'react'
import { Text } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'

import type { OrderSubOrder, OrderWithSubOrders } from '@/types'

// What every prescription layout shares: the sheet, the typewriter-style Field
// the data layers are built from, and the practice stamp.

export const PAGE_WIDTH = 419.53 // A6 landscape
export const PAGE_HEIGHT = 297.64

/** A full-sheet, absolutely positioned layer — templates and data alike. */
export const LAYER = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: PAGE_WIDTH,
  height: PAGE_HEIGHT,
} as const

const DATA_FONT = { fontFamily: 'Courier', fontSize: 12, lineHeight: 1 } as const
const STAMP_FONT = { fontFamily: 'Helvetica', fontSize: 8.5, lineHeight: 1 } as const

type FieldProps = {
  x: number
  y: number
  children?: string | null
  /** Right-align: the text ends at x instead of starting there. */
  alignRight?: boolean
  size?: number
  bold?: boolean
}

const RIGHT_BOX = 120

/**
 * One line of data. `y` is the top of the text box — roughly the baseline minus
 * 9pt at the default 12pt. Renders nothing for an empty value.
 */
export const Field = ({ x, y, children, alignRight, size = DATA_FONT.fontSize, bold }: FieldProps) =>
  children ? (
    <Text
      style={{
        ...DATA_FONT,
        fontFamily: bold ? 'Courier-Bold' : 'Courier',
        fontSize: size,
        position: 'absolute',
        top: y,
        ...(alignRight ? { left: x - RIGHT_BOX, width: RIGHT_BOX, textAlign: 'right' } : { left: x }),
      }}
    >
      {children}
    </Text>
  ) : null

/** The forms print short dates: 30.04.26. */
export const shortDate = (value?: string | null) => {
  if (!value) return null
  try {
    return format(parseISO(value), 'dd.MM.yy')
  } catch {
    return null
  }
}

export const joinParts = (...parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(' ') || null

/** RA, LA, or RA+LA for a suborder with both eyes. */
export const eyesLabel = (suborder: OrderSubOrder) =>
  [suborder.right_eye && 'RA', suborder.left_eye && 'LA'].filter(Boolean).join('+')

/**
 * The practice stamp, printed in place of the rubber one: centred lines in
 * [left, left + width]. Empty lines are skipped so the block closes up instead
 * of leaving gaps.
 */
export function Stamp({
  order,
  left,
  top,
  width,
  lineGap = 11,
}: {
  order: OrderWithSubOrders
  left: number
  top: number
  width: number
  lineGap?: number
}) {
  const office = order.doctor_office
  const doctor = office?.default_doctor
  const lines = [
    joinParts(doctor?.first_name, doctor?.last_name),
    office?.name,
    joinParts(office?.street, office?.house_number),
    office?.phone_number ? `Tel.: ${office.phone_number}` : null,
    joinParts(office?.zipcode, office?.city),
  ].filter(Boolean)

  return (
    <>
      {lines.map((line, i) => (
        <Text
          key={i}
          style={{ ...STAMP_FONT, position: 'absolute', left, width, top: top + i * lineGap, textAlign: 'center' }}
        >
          {line}
        </Text>
      ))}
    </>
  )
}
