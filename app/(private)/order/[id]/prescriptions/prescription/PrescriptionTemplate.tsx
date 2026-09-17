import React from 'react'
import { Line, Rect, Svg, Text, View, StyleSheet } from '@react-pdf/renderer'

import { PAGE_HEIGHT, PAGE_WIDTH } from './shared'

// The pre-printed half of the prescription: the red form (Muster 16, printed as
// "IVOM PRIVATREZEPT") redrawn from a scan of the real blanks. Everything the
// practice fills in lives in PrescriptionFields — this layer only ever draws the
// paper, so leaving it out gives a data-only PDF for printing onto blanks that
// already carry it.
//
// All coordinates are PDF points from the page's top-left corner, measured off
// the scan. PrescriptionFields is measured off the same scan, which is what
// keeps the two layers aligned.

const RED = '#D4406A'
const WATERMARK = '#F6E0EA'
const THIN = 0.6
const THICK = 1.8

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  },
})

type LabelProps = {
  x: number
  y: number
  children: string
  size?: number
  bold?: boolean
  /** Give a width to centre or right-align the label inside [x, x + width]. */
  width?: number
  align?: 'left' | 'center' | 'right'
  color?: string
  letterSpacing?: number
}

// Form labels are never hyphenated: react-pdf would otherwise split a word like
// "Sonstige" to fit a narrow box.
const noHyphenation = (word: string) => [word]

const Label = ({ x, y, children, size = 5.5, bold, width, align = 'left', color = RED, letterSpacing }: LabelProps) => (
  <Text
    hyphenationCallback={noHyphenation}
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      textAlign: align,
      color,
      letterSpacing,
      fontFamily: bold ? 'Helvetica-Bold' : 'Helvetica',
      // fontSize and lineHeight on the same element: react-pdf resolves a
      // unitless lineHeight against this element's own fontSize.
      fontSize: size,
      lineHeight: 1.1,
    }}
  >
    {children}
  </Text>
)

const Box = ({ x, y, w, h, stroke = THIN }: { x: number; y: number; w: number; h: number; stroke?: number }) => (
  <Rect x={x} y={y} width={w} height={h} stroke={RED} strokeWidth={stroke} fill='none' />
)

const HLine = ({ x1, x2, y, stroke = THIN }: { x1: number; x2: number; y: number; stroke?: number }) => (
  <Line x1={x1} y1={y} x2={x2} y2={y} stroke={RED} strokeWidth={stroke} />
)

const VLine = ({
  x,
  y1,
  y2,
  stroke = THIN,
  dash,
}: {
  x: number
  y1: number
  y2: number
  stroke?: number
  dash?: string
}) => <Line x1={x} y1={y1} x2={x} y2={y2} stroke={RED} strokeWidth={stroke} strokeDasharray={dash} />

// Left margin: the tick boxes beside the patient block and the Rp. area.
const SIDE_BOXES = [
  { y: 23.3, label: 'Gebühr\nfrei' },
  { y: 42, label: 'Geb.-\npfl.' },
  { y: 60.7, label: 'noctu' },
  { y: 84.3, label: 'Sonstige' },
  { y: 108.3, label: 'Unfall' },
  { y: 132.7, label: 'Arbeits-\nunfall' },
  { y: 166.7, label: 'aut\nidem' },
  { y: 190.7, label: 'aut\nidem' },
  { y: 214.3, label: 'aut\nidem' },
]
const SIDE_BOX = { x: 7.3, w: 15, h: 14.3 }

// Top right: the numbered code boxes and their headings.
const CODE_BOXES = [
  { digit: '', label: 'BVG' },
  { digit: '', label: 'Hilfs-\nmittel' },
  { digit: '', label: 'Impf-\nstoff' },
  { digit: '', label: 'Spr.-St.\nBedarf' },
]
const CODE_BOX = { x: 256.7, y: 25, w: 13.3, h: 16 }

// Zuzahlung / Gesamt-Brutto: one thick box, split at DIVIDER, with dashed digit
// cells and a solid tick where the decimal point goes.
const AMOUNT = { x: 256.7, y: 50, w: 150.3, h: 21, divider: 311 }
const AMOUNT_DASHES = [270.3, 297.7, 324.7, 338.3, 352, 365.7, 393]
const AMOUNT_DECIMALS = [284, 379.3]

// The three "Verordnung" rows, each with Faktor and Taxe columns and a digit
// ruler along its top edge.
const ROWS = [
  { y: 79, h: 19, label: '1. Verordnung' },
  { y: 99.3, h: 22.4, label: '2. Verordnung' },
  { y: 122.7, h: 23, label: '3. Verordnung' },
]
const ROW = { x: 256.7, w: 150.3, faktor: 347.3, taxe: 364.3, tickStep: 10 }

export function PrescriptionTemplate() {
  return (
    <View style={styles.layer} fixed>
      {/* Drawn first so every other mark, and the data layer, sits on top. */}
      <Label x={147} y={162} size={66} bold color={WATERMARK} letterSpacing={8}>
        IVOM
      </Label>

      <Svg style={styles.layer} width={PAGE_WIDTH} height={PAGE_HEIGHT} viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}>
        {/* Patient block */}
        <Box x={25} y={13.3} w={225.7} h={132.4} />
        <HLine x1={25} x2={250.7} y={42.3} />
        <HLine x1={25} x2={250.7} y={98.3} />
        <HLine x1={25} x2={250.7} y={122.3} />
        <VLine x={105.7} y1={98.3} y2={104} />
        <VLine x={192.3} y1={116.5} y2={122.3} />
        <VLine x={105.7} y1={122.3} y2={128} />
        <VLine x={182.7} y1={139.5} y2={145.7} />

        {SIDE_BOXES.map(({ y }) => (
          <Box key={y} x={SIDE_BOX.x} y={y} w={SIDE_BOX.w} h={SIDE_BOX.h} />
        ))}

        {/* Code boxes, Begr.-Pflicht, Apotheken-Nummer */}
        {CODE_BOXES.map((_, i) => (
          <Box key={i} x={CODE_BOX.x + i * CODE_BOX.w} y={CODE_BOX.y} w={CODE_BOX.w} h={CODE_BOX.h} />
        ))}
        <Box x={319.3} y={25} w={13} h={16} />
        <Box x={339.3} y={25} w={67.7} h={16} />

        {/* Zuzahlung / Gesamt-Brutto */}
        <Box x={AMOUNT.x} y={AMOUNT.y} w={AMOUNT.w} h={AMOUNT.h} stroke={THICK} />
        <VLine x={AMOUNT.divider} y1={AMOUNT.y} y2={AMOUNT.y + AMOUNT.h} stroke={THICK} />
        {AMOUNT_DASHES.map((x) => (
          <VLine key={x} x={x} y1={AMOUNT.y + 2} y2={AMOUNT.y + AMOUNT.h - 2} dash='2,1.5' />
        ))}
        {AMOUNT_DECIMALS.map((x) => (
          <React.Fragment key={x}>
            <VLine x={x} y1={AMOUNT.y + 2} y2={AMOUNT.y + 13} dash='2,1.5' />
            <VLine x={x} y1={AMOUNT.y + 14} y2={AMOUNT.y + AMOUNT.h} stroke={1.5} />
          </React.Fragment>
        ))}

        {/* Verordnung rows */}
        {ROWS.map(({ y, h }) => (
          <React.Fragment key={y}>
            <Box x={ROW.x} y={y} w={ROW.w} h={h} />
            <VLine x={ROW.faktor} y1={y} y2={y + h} />
            <VLine x={ROW.taxe} y1={y} y2={y + h} />
            {Array.from({ length: 8 }, (_, k) => (
              <VLine key={k} x={ROW.x + (k + 1) * ROW.tickStep} y1={y} y2={y + 3} />
            ))}
          </React.Fragment>
        ))}

        {/* Abgabedatum boxes */}
        {Array.from({ length: 6 }, (_, i) => (
          <Box key={i} x={85 + i * 12.3} y={231} w={12.3} h={16.3} />
        ))}

        {/* Bottom edge: the stepped rule and the form-name box */}
        <HLine x1={202.7} x2={407} y={249} stroke={THICK} />
        <VLine x={202.7} y1={249} y2={288} stroke={THICK} />
        <HLine x1={7.3} x2={202.7} y={288} stroke={THICK} />
        <Box x={7.3} y={256.7} w={192.7} h={28.3} />
      </Svg>

      {/* Headings and field labels */}
      <Label x={28} y={3.5} bold>
        Bitte nur maschinell ausfüllen
      </Label>
      <Label x={28} y={15}>Krankenkasse bzw. Kostenträger</Label>
      <Label x={28} y={43.5}>Name, Vorname des Versicherten</Label>
      <Label x={207.3} y={58.5}>geb. am</Label>
      <Label x={28} y={99.5}>Kostenträgerkennung</Label>
      <Label x={108} y={99.5}>Versicherten-Nr.</Label>
      <Label x={200} y={99.5}>Status</Label>
      <Label x={28} y={123.5}>Betriebsstätten-Nr.</Label>
      <Label x={108} y={123.5}>Arzt-Nr.</Label>
      <Label x={186} y={123.5}>Datum</Label>

      {SIDE_BOXES.map(({ y, label }) => {
        const lines = label.split('\n').length
        return (
          <Label
            key={y}
            x={SIDE_BOX.x}
            y={y + (SIDE_BOX.h - lines * 4.4) / 2}
            width={SIDE_BOX.w}
            align='center'
            size={3.7}
          >
            {label}
          </Label>
        )
      })}

      {CODE_BOXES.map(({ digit, label }, i) => {
        const x = CODE_BOX.x + i * CODE_BOX.w
        const lines = label.split('\n').length
        return (
          <React.Fragment key={i}>
            <Label x={x} y={lines === 1 ? 18.5 : 13.5} width={CODE_BOX.w} align='center' size={4.3}>
              {label}
            </Label>
            <Label x={x} y={30} width={CODE_BOX.w} align='center' size={6} bold>
              {digit}
            </Label>
          </React.Fragment>
        )
      })}
      <Label x={318.3} y={13} width={15} align='center' size={5}>
        {'Begr.-\nPflicht'}
      </Label>
      <Label x={339.3} y={18.5} width={67.7} align='center' size={5}>
        Apotheken-Nummer / IK
      </Label>

      <Label x={256.7} y={43}>Zuzahlung</Label>
      <Label x={311} y={43}>Gesamt-Brutto</Label>

      <Label x={257} y={73.5}>Arzneimittel-Hilfsmittel-Nr.</Label>
      <Label x={ROW.faktor} y={73.5} width={ROW.taxe - ROW.faktor} align='center'>
        Faktor
      </Label>
      <Label x={ROW.taxe} y={73.5} width={ROW.x + ROW.w - ROW.taxe} align='center'>
        Taxe
      </Label>
      {ROWS.map(({ y, label }) => (
        <Label key={y} x={258} y={y + 4} size={5}>
          {label}
        </Label>
      ))}

      <Label x={33.3} y={149.5} size={8.5} bold>
        Rp.
      </Label>
      <Label x={48} y={152}>(Bitte Leerräume durchstreichen)</Label>
      <Label x={302} y={152} width={100} align='right'>
        Vertragsarztstempel
      </Label>

      <Label x={163} y={232} bold>
        {'Abgabedatum\nin der Apotheke'}
      </Label>
      <Label x={302} y={239} width={100} align='right'>
        Unterschrift des Arztes
      </Label>

      <Label x={7.3} y={265.5} width={192.7} align='center' size={9.5} bold>
        IVOM PRIVATREZEPT
      </Label>
    </View>
  )
}
