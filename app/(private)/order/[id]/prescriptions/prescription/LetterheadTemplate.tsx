import React from 'react'
import { Line, Rect, Svg, Text, View } from '@react-pdf/renderer'

import type { OrderWithSubOrders } from '@/types'

import { LAYER, PAGE_HEIGHT, PAGE_WIDTH, joinParts } from './shared'

// The pre-printed half of the practice's own prescription pad: a thin blue
// frame, a rule beside the patient block, the letterhead on the right and a
// pale blue band behind the prescription. Redrawn from a scan of the real pad;
// coordinates are PDF points from the top-left, measured off that scan, as are
// LetterheadFields'.
//
// The letterhead is built from the ordering office rather than copied off the
// scan, so every office gets its own. Lines the office has no data for are left
// out, and each group closes up around them.

const FRAME = '#9DC3E3'
const BAND = '#D3E6F5'
const INK = '#1A1A1A'

const LETTERHEAD = { left: 252.7, width: 150 }
const BAND_AREA = { x: 25, y: 150, w: 371.7, h: 123.3, steps: 40 }

type LetterLine = { text: string | null; bold?: boolean }

/** Lines stacked from `top`, 10pt apart, skipping the empty ones. */
const Block = ({ top, lines }: { top: number; lines: LetterLine[] }) => (
  <>
    {lines
      .filter((line) => line.text)
      .map((line, i) => (
        <Text
          key={i}
          style={{
            position: 'absolute',
            left: LETTERHEAD.left,
            width: LETTERHEAD.width,
            top: top + i * 10.3,
            color: INK,
            fontFamily: line.bold ? 'Helvetica-Bold' : 'Helvetica',
            fontSize: line.bold ? 8.5 : 7.8,
            lineHeight: 1,
          }}
        >
          {line.text}
        </Text>
      ))}
  </>
)

export function LetterheadTemplate({ order }: { order: OrderWithSubOrders }) {
  const office = order.doctor_office
  const doctor = office?.default_doctor

  return (
    <View style={LAYER} fixed>
      <Svg style={LAYER} width={PAGE_WIDTH} height={PAGE_HEIGHT} viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}>
        {/* The band fades in from white at the top. Stacked strips rather than an
            SVG gradient: react-pdf ignores a LinearGradient's direction and
            draws it left to right. */}
        {Array.from({ length: BAND_AREA.steps }, (_, i) => (
          <Rect
            key={i}
            x={BAND_AREA.x}
            y={BAND_AREA.y + (i * BAND_AREA.h) / BAND_AREA.steps}
            width={BAND_AREA.w}
            height={BAND_AREA.h / BAND_AREA.steps + 0.2}
            fill={BAND}
            fillOpacity={(i + 1) / BAND_AREA.steps}
          />
        ))}
        <Rect x={13.3} y={11} width={395} height={274} stroke={FRAME} strokeWidth={0.6} fill='none' />
        <Line x1={245} y1={22.7} x2={245} y2={135} stroke={INK} strokeWidth={0.6} />
      </Svg>

      <Block
        top={21}
        lines={[
          { text: joinParts(doctor?.first_name, doctor?.last_name), bold: true },
          { text: office?.name ?? null },
        ]}
      />
      <Block
        top={55}
        lines={[
          { text: joinParts(office?.street, office?.house_number) },
          { text: joinParts(office?.zipcode, office?.city) },
          { text: office?.phone_number ? `Tel. ${office.phone_number}` : null },
          { text: office?.email ?? null },
        ]}
      />
    </View>
  )
}
