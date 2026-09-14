import React from 'react'
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer'

import type { OrderWithSubOrders } from '@/types'
import { formatDateFromString } from '@/lib/utils'

// A6 landscape: 148 × 105 mm. Every field is a label/value line in a titled
// section — a plain data sheet for now, until the real prescription layout is
// designed. Two columns so everything fits on one sheet: the order and its
// office on the left, identical on every page, and the suborder's patient on
// the right, which is the only part that changes from page to page.
const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 6.5,
    color: '#000000',
  },
  column: {
    flex: 1,
  },
  columnGap: {
    width: 12,
  },
  section: {
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 7.5,
    fontWeight: 700,
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    paddingBottom: 1,
    marginBottom: 2,
  },
  line: {
    flexDirection: 'row',
  },
  // react-pdf turns a unitless lineHeight into points using the fontSize of the
  // element it is declared on — 18pt by default. So it lives here, next to an
  // explicit fontSize, rather than on the row View, where it came out as 24pt.
  label: {
    width: 58,
    fontSize: 6.5,
    lineHeight: 1.3,
    color: '#555555',
  },
  value: {
    flex: 1,
    fontSize: 6.5,
    lineHeight: 1.3,
  },
})

const joinParts = (...parts: (string | null | undefined)[]) =>
  parts.filter(Boolean).join(' ')

// "Street 1, 12345 City", dropping whichever half is empty.
const address = (row?: {
  street: string | null
  house_number: string | null
  zipcode: string | null
  city: string | null
} | null) =>
  [joinParts(row?.street, row?.house_number), joinParts(row?.zipcode, row?.city)]
    .filter(Boolean)
    .join(', ')

const Line = ({ label, value }: { label: string; value?: string | number | null }) => (
  <View style={styles.line}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value === null || value === undefined || value === '' ? '—' : value}</Text>
  </View>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
)

const GENDER_LABEL: Record<string, string> = {
  male: 'männlich',
  female: 'weiblich',
  other: 'divers',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Offen',
  processing: 'In Bearbeitung',
  ready: 'Bereit',
  delivered: 'Geliefert',
}

/** One page per suborder: the full order, plus that suborder's patient. */
export const OrderPrescriptions = ({ order }: { order: OrderWithSubOrders }) => {
  const office = order.doctor_office
  const doctor = office?.default_doctor
  const creator = order.created_by

  // The left column is the same on every page, so it is built once.
  const orderColumn = (
    <View style={styles.column}>
      <Section title='Bestellung'>
        <Line label='Medikament' value={order.medicine?.name} />
        <Line label='Typ' value={order.medicine?.medicine_type} />
        <Line label='Menge gesamt' value={order.quantity} />
        <Line label='Patienten' value={order.suborders.length} />
        <Line label='Status' value={order.status ? STATUS_LABEL[order.status] : null} />
        <Line label='OP-Datum' value={formatDateFromString(order.application_date)} />
        <Line label='Lieferdatum' value={formatDateFromString(order.delivery_date)} />
        <Line label='Erstellt am' value={formatDateFromString(order.created_at)} />
        <Line
          label='Erstellt von'
          value={joinParts(creator?.first_name, creator?.last_name) || creator?.email}
        />
      </Section>

      <Section title='Praxis'>
        <Line label='Name' value={office?.name} />
        <Line label='Adresse' value={address(office)} />
        <Line label='Telefon' value={office?.phone_number} />
        <Line label='E-Mail' value={office?.email} />
        <Line label='Arzt' value={joinParts(doctor?.first_name, doctor?.last_name)} />
        <Line label='Arztnummer' value={doctor?.doctor_number} />
      </Section>
    </View>
  )

  return (
    <Document>
      {order.suborders.map((sub, i) => {
        const patient = sub.patient
        // Quantity is a per-eye count, as everywhere else: both eyes count two.
        const quantity = (sub.left_eye ? 1 : 0) + (sub.right_eye ? 1 : 0)
        const eyes = [sub.left_eye && 'L', sub.right_eye && 'R'].filter(Boolean).join(' + ')

        return (
          // wrap={false}: one sheet per suborder, always. Content that ever runs
          // past the sheet is cut off rather than starting a second page.
          <Page key={sub.id} size='A6' orientation='landscape' style={styles.page} wrap={false}>
            {orderColumn}

            <View style={styles.columnGap} />

            <View style={styles.column}>
              <Section title={`Patient ${i + 1} / ${order.suborders.length}`}>
                <Line label='Name' value={joinParts(patient?.last_name, patient?.first_name)} />
                <Line label='Geb.-Datum' value={formatDateFromString(patient?.date_of_birth)} />
                <Line label='Geschlecht' value={patient?.gender ? GENDER_LABEL[patient.gender] : null} />
                <Line label='Adresse' value={address(patient)} />
                <Line label='Krankenkasse' value={patient?.insurance_companies?.name} />
                <Line label='IK-Nummer' value={patient?.insurance_companies?.iknumber} />
                <Line label='Versichertennr.' value={patient?.insurance_number} />
              </Section>

              <Section title='Verordnung'>
                <Line label='Auge' value={eyes} />
                <Line label='Menge' value={quantity} />
                <Line label='Rechnungsstellung' value={sub.invoice_type} />
              </Section>
            </View>
          </Page>
        )
      })}
    </Document>
  )
}
