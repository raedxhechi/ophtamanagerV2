import React from 'react'
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer'

import type { OrderWithSubOrders } from '@/types'
import { formatDateFromString } from '@/lib/utils'

// Column widths (must sum to 100). Mirrors the HTML mock's loose column sizing:
// a narrow Pos/Auge/Anzahl, wide Patient + Rechnungsstellung.
const COL = {
  pos: '6%',
  patient: '24%',
  dob: '13%',
  insurance: '16%',
  invoice: '23%',
  eye: '8%',
  count: '10%',
} as const

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    paddingVertical: 40,
    paddingHorizontal: 48,
    fontSize: 10,
    color: '#000000',
  },

  // Header: 2x2 grid of address/contact blocks.
  headerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  headerCell: {
    width: '50%',
    marginBottom: 18,
    fontSize: 9,
    fontWeight: 500,
    lineHeight: 1.4,
  },
  // The right-hand cell already ends at the right margin; aligning its text
  // there too sets the pharmacy block flush against the page edge instead of
  // starting it at the horizontal midpoint.
  headerCellRight: {
    textAlign: 'right',
  },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
  },

  // Table.
  theadRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 6,
    fontSize: 9,
    fontWeight: 700,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingVertical: 8,
    fontSize: 9,
  },
  cellCenter: { textAlign: 'center' },

  totalRow: {
    textAlign: 'right',
    marginTop: 8,
  },

  legal: {
    fontSize: 9,
    lineHeight: 1.5,
    marginTop: 32,
  },

  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 70,
  },
  signatureBox: {
    width: '42%',
    borderTopWidth: 2,
    borderTopColor: '#000000',
    paddingTop: 4,
  },
  signatureLabel: {
    fontSize: 9,
    fontWeight: 500,
  },
})

// "(X) Praxis ( ) Patient ( ) Kasse" — marks the chosen invoice type.
const invoiceLine = (invoice: string | null | undefined) => {
  const mark = (type: string) => (invoice === type ? 'X' : ' ')
  return `(${mark('Praxis')}) Praxis (${mark('Patient')}) Patient (${mark('Kasse')}) Kasse`
}

export const OrderReceipt = ({ order }: { order: OrderWithSubOrders }) => {
  // The office that placed the order, embedded by ORDER_SELECT. Taken from the
  // order rather than the signed-in user so an admin printing another office's
  // receipt gets that office's address.
  const office = order.doctor_office
  // The pharmacy serving that office — the receipt's recipient. Null until an
  // office is assigned one (doctor_office.pharmacy_id is nullable), in which
  // case the cell renders blank rather than breaking the header grid.
  const pharmacy = office?.pharmacy

  const total = order.suborders.reduce(
    (sum, sub) => sum + (sub.left_eye ? 1 : 0) + (sub.right_eye ? 1 : 0),
    0
  )

  return (
    <Document>
      <Page size='A4' style={styles.page}>
        {/* Address / contact header */}
        <View style={styles.headerGrid}>
          <View style={styles.headerCell}>
            <Text>{office?.name}</Text>
            <Text>{[office?.street, office?.house_number].filter(Boolean).join(' ')}</Text>
            <Text>{[office?.zipcode, office?.city].filter(Boolean).join(' ')}</Text>
          </View>

          <View style={styles.headerCell}>
            <Text>{pharmacy?.name}</Text>
            <Text>{[pharmacy?.street, pharmacy?.house_number].filter(Boolean).join(' ')}</Text>
            <Text>{[pharmacy?.zipcode, pharmacy?.city].filter(Boolean).join(' ')}</Text>
          </View>

          <View style={styles.headerCell}>
            <Text>Ansprechpartner: {office?.contact_person}</Text>
            <Text>Lieferdatum: {formatDateFromString(order.delivery_date)}</Text>
            <Text>OP-Datum: {formatDateFromString(order.application_date)}</Text>
          </View>

          {/* <View style={styles.headerCell}>
            <Text>{office?.phone_number}</Text>
            <Text>{office?.email}</Text>
          </View> */}
        </View>

        {/* Title: medicine + creation date */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{order.medicine?.name}</Text>
          <Text style={styles.title}>{formatDateFromString(order.created_at)}</Text>
        </View>

        {/* Suborder table */}
        <View style={styles.theadRow}>
          <Text style={[{ width: COL.pos }, styles.cellCenter]}>Pos.</Text>
          <Text style={{ width: COL.patient }}>Patient</Text>
          <Text style={{ width: COL.dob }}>Geb.-Datum</Text>
          <Text style={{ width: COL.insurance }}>Krankenkasse</Text>
          <Text style={{ width: COL.invoice }}>Rechnungsstellung</Text>
          <Text style={[{ width: COL.eye }, styles.cellCenter]}>Auge</Text>
          <Text style={[{ width: COL.count }, styles.cellCenter]}>Anzahl</Text>
        </View>

        {order.suborders.map((sub, i) => {
          const count = (sub.left_eye ? 1 : 0) + (sub.right_eye ? 1 : 0)
          return (
            <View style={styles.row} key={sub.id}>
              <Text style={[{ width: COL.pos }, styles.cellCenter]}>{i + 1}</Text>
              <Text style={{ width: COL.patient }}>
                {sub.patient?.first_name} {sub.patient?.last_name}
              </Text>
              <Text style={{ width: COL.dob }}>
                {formatDateFromString(sub.patient?.date_of_birth)}
              </Text>
              <Text style={{ width: COL.insurance }}>
                {sub.patient?.insurance_companies?.name}
              </Text>
              <Text style={{ width: COL.invoice }}>{invoiceLine(sub.invoice_type)}</Text>
              <Text style={[{ width: COL.eye }, styles.cellCenter]}>
                {sub.left_eye ? 'L' : ''}
                {sub.right_eye ? 'R' : ''}
              </Text>
              <Text style={[{ width: COL.count }, styles.cellCenter]}>{count}</Text>
            </View>
          )
        })}

        <Text style={styles.totalRow}>Total {total}</Text>

        {/* Legal note */}
        <Text style={styles.legal}>
          *Der Patient hat die anfordernde Praxis/Klinik unter Verzicht auf sein Auswahlrecht
          beauftragt, die Arzneimittel für ihn zu beschaffen oder er hat von seinem Auswahlrecht
          gebrauch gemacht und die St. Alexius Apotheke beauftragt, die benötigten Arzneimittel
          für die IVOM Therapie direkt an die anfordernde Praxis/Klinik zu liefern. Mit Versand
          (via Formular) dieser Verordnung bestätigt der Verordner, dass das Rezept im Original
          vorliegt/ die Rezepte im Original vorliegen und der St. Alexius Apotheke zugesandt
          werden.
        </Text>

        {/* Signature lines */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Ort, Datum</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Unterschrift</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
