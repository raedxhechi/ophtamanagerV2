'use client'

import type { SubOrder } from '@/types'

import { client } from './client'

// Aliased so the embedded relations come back under the singular keys the
// SubOrder type and the suborder table columns read: `patient` and `order`.
const SUBORDER_SELECT = `
  *,
  patient:patients (
    *,
    insurance_companies (*)
  ),
  order:orders (
    *,
    medicine (*)
  )
`

export const getSubOrder = async (id: string) => {
  const { data, error } = await client
    .from('suborders')
    .select(SUBORDER_SELECT)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as unknown as SubOrder
}

// The trimmed suborder shape the patients table's expanded row renders (mirrors
// SubOrderForPatient in patients/_components/SubOrdersTable). Only the fields
// that table needs are selected.
export interface SubOrderForPatientRow {
  id: string
  left_eye: boolean
  right_eye: boolean
  first_name: string
  last_name: string
  date_of_birth: string | null
  order: {
    application_date: string | null
    delivery_date: string | null
    medicine: { name: string } | null
  }
}

const SUBORDER_FOR_PATIENT_SELECT = `
  id,
  left_eye,
  right_eye,
  patient_id,
  patient:patients ( first_name, last_name, date_of_birth ),
  order:orders ( application_date, delivery_date, medicine ( name ) )
`

/**
 * Fetch the current office's suborders in one query and group them by patient
 * id. Used to lazily populate the patients table's expandable rows after the
 * page has loaded.
 *
 * We deliberately do NOT filter by the visible patient ids: RLS already scopes
 * suborders to the office's orders (whose patients are exactly the office's
 * patients), so an unfiltered fetch returns the same set. Passing every
 * patient id through `.in(...)` instead builds a URL that grows with the
 * patient count and starts returning "Bad Request" past ~a few hundred ids.
 */
export const listSubOrdersByPatients = async (): Promise<
  Record<string, SubOrderForPatientRow[]>
> => {
try {


  const { data, error } = await client
    .from('suborders')
    .select(SUBORDER_FOR_PATIENT_SELECT)

  if (error){
    console.error('Error fetching suborders by patients:', error)
    throw error
  }

  const byPatient: Record<string, SubOrderForPatientRow[]> = {}
  for (const row of (data ?? []) as any[]) {
    const mapped: SubOrderForPatientRow = {
      id: row.id,
      left_eye: row.left_eye,
      right_eye: row.right_eye,
      first_name: row.patient?.first_name ?? '',
      last_name: row.patient?.last_name ?? '',
      date_of_birth: row.patient?.date_of_birth ?? null,
      order: {
        application_date: row.order?.application_date ?? null,
        delivery_date: row.order?.delivery_date ?? null,
        medicine: row.order?.medicine ? { name: row.order.medicine.name } : null,
      },
    }
    ;(byPatient[row.patient_id] ??= []).push(mapped)
  }
  return byPatient
    } catch (error) {
   console.error('Unexpected error in listSubOrdersByPatients:', error)
   throw error 
  }
}
