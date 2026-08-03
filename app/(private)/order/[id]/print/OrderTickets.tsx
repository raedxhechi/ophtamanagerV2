import React from 'react'
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer'
import { text } from 'stream/consumers'
import { formatDateFromString } from '@/lib/utils'
import { it } from 'date-fns/locale'

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF00',
  },
  section: {
    flexGrow: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bdt: {
    flexGrow: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 12,
    fontWeight: 500,
  },
  birthDate: {
    fontSize: 12,
    fontWeight: 500,
    marginRight: 10,
  },
  eye: {
    fontSize: 16,
    fontWeight: 700,
  },
})

export interface OrderTicketsProps {
  items: any[]
}

export const SingleTicket = ({ item }: { item: any }) => {
  return (
    <Page size={{ width: '18mm', height: '51mm' }} style={styles.page} orientation='landscape'>
      <View style={styles.section}>
        <Text style={styles.name} wrap={false}>
          {item.fullName}
        </Text>
      </View>
      <View style={styles.bdt}>
        <Text style={styles.birthDate} wrap={false}>
          {formatDateFromString(item.dateOfBirth)}
        </Text>
        <Text style={styles.eye} wrap={false}>
          {item.label}
        </Text>
      </View>
    </Page>
  )
}

// Create Document Component
export const OrderTickets = ({ items }: OrderTicketsProps) => (
  <Document>
    {items.map((item) => (
      <SingleTicket key={item.fullName} item={item} />
    ))}
  </Document>
)
