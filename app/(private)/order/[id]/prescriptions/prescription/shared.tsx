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

/**
 * The stamp's two type sizes, and how far one line pushes the next down. The
 * leading is barely over 1 on purpose: the rubber stamp this stands in for sets
 * its lines almost touching, and the block has to fit the space beside the
 * signature.
 */
const STAMP_SIZE = { bold: 9, plain: 7.8 } as const
const STAMP_LEADING = 1.06

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
 * [left, left + width], set the way the real stamp sets them —
 *
 *   **Doctor's name**            bold, large
 *   Practice name                plain
 *   Street and house no. Tel.    plain
 *   **Postcode and town**        bold, large
 *   BSNR                         plain
 *
 * Each line advances by its own height rather than by a fixed gap, so the two
 * bold ones take the room they need without opening a space under the small
 * ones. Empty lines are dropped before anything is placed, so the block closes
 * up instead of leaving a hole where a missing phone number would have been.
 */
export function Stamp({
  order,
  left,
  top,
  width,
  leading = STAMP_LEADING,
}: {
  order: OrderWithSubOrders
  left: number
  top: number
  width: number
  /** Line height as a multiple of each line's own size. */
  leading?: number
}) {
  const office = order.doctor_office
  const doctor = office?.default_doctor

  const lines: { text: string; bold: boolean }[] = []
  const add = (text: string | null, bold = false) => {
    if (text) lines.push({ text, bold })
  }

  add(joinParts(doctor?.first_name, doctor?.last_name), true)
  add(office?.name ?? null)
  add(
    joinParts(
      joinParts(office?.street, office?.house_number),
      office?.phone_number ? `Tel.: ${office.phone_number}` : null
    )
  )
  add(joinParts(office?.zipcode, office?.city), true)
  add(office?.bsnr ? `BSNR: ${office.bsnr}` : null)

  // Walked once up front: a line's position depends on the heights of every
  // line above it, and they are not all the same height.
  let offset = 0
  const placed = lines.map((line) => {
    const fontSize = line.bold ? STAMP_SIZE.bold : STAMP_SIZE.plain
    const y = top + offset
    offset += fontSize * leading
    return { ...line, fontSize, y }
  })

  return (
    <>
      {placed.map((line, i) => (
        <Text
          key={i}
          style={{
            position: 'absolute',
            left,
            width,
            top: line.y,
            textAlign: 'center',
            fontFamily: line.bold ? 'Helvetica-Bold' : 'Helvetica',
            fontSize: line.fontSize,
            lineHeight: 1,
          }}
        >
          {line.text}
        </Text>
      ))}
    </>
  )
}
