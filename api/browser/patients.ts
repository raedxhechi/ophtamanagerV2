'use client'

import type { Patient, PatientWithInsuranceCompany } from '@/types'
import type { TablesInsert, TablesUpdate } from '@/types/supabase'

import { client } from './client'

// Columns + relations the patient views need. Mirrors the old Directus field
// list: the patient, their insurance company, and their suborders (each with
// the parent order and that order's medicine).
const PATIENT_SELECT = `
  *,
  insurance_companies (*),
  suborders (
    *,
    orders (
      *,
      medicine (*)
    )
  )
`

// A lighter projection for the order form's patient picker.
const PATIENT_PICKER_SELECT = `*, insurance_companies (*)`

// The office the signed-in user belongs to. patients.doctor_office_id has no
// default, and RLS requires inserts to be scoped to this office, so we resolve
// it explicitly before creating a patient.
const getCurrentOfficeId = async () => {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await client
    .from('user_data')
    .select('doctor_office_id')
    .eq('id', user.id)
    .single()

  if (error) throw error
  if (!data?.doctor_office_id) throw new Error('Current user is not linked to a doctor office')
  return data.doctor_office_id
}

// Map the form payload onto the patients table columns. Accepts either the new
// snake_case field names or the old camelCase ones so existing callers keep
// working. (There is no `title` column in Supabase, so it is dropped.)
const toPatientColumns = (data: any) => ({
  first_name: data.first_name ?? data.firstName,
  last_name: data.last_name ?? data.lastName,
  gender: data.gender || null,
  date_of_birth: data.date_of_birth ?? data.dateOfBirth,
  street: data.street || null,
  house_number: data.house_number ?? data.houseNumber ?? null,
  zipcode: data.zipcode ?? data.zipCode ?? null,
  city: data.city || null,
  insurance_company_id: data.insurance_company_id ?? data.insuranceCompany ?? null,
  insurance_number: data.insurance_number ?? data.insuranceNumber ?? null,
})

export const addPatient = async (data: any) => {
  const doctor_office_id = await getCurrentOfficeId()

  const insert: TablesInsert<'patients'> = {
    ...toPatientColumns(data),
    doctor_office_id,
  }

  const { data: result, error } = await client
    .from('patients')
    .insert(insert)
    .select()
    .single()

  if (error) throw error
  return result
}

export const updatePatient = async ({ id, data }: { id: string; data: any }) => {
  const update: TablesUpdate<'patients'> = toPatientColumns(data)

  const { data: result, error } = await client
    .from('patients')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return result
}

// Build the search across the columns that used to live in `searchText`. Every
// whitespace-separated token must match (in any order) against at least one of
// the name / insurance / address columns.
const applyPatientSearch = <T extends { or: (f: string) => T; and: (f: string) => T }>(
  query: T,
  search: string
) => {
  const tokens = search.trim().split(/\s+/).filter(Boolean)
  const columns = [
    'first_name',
    'last_name',
    'insurance_number',
    'date_of_birth',
    'city',
    'street',
    'zipcode',
  ]

  return tokens.reduce(
    (q, token) => q.or(columns.map((col) => `${col}.ilike.%${token}%`).join(',')),
    query
  )
}

// Fetch every patient the current office can see (paged internally). Used by the
// "export all patients" flow. RLS already scopes rows to the office.
export async function listPatients() {
  const pageSize = 1000
  const patients: Patient[] = []

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from('patients')
      .select(PATIENT_SELECT)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (error) throw error
    patients.push(...((data ?? []) as unknown as Patient[]))
    if (!data || data.length < pageSize) break
  }

  return patients
}

// One page of patients plus the total count, for the paginated list view.
export async function listPatientsPage(page: number, pageSize: number, search = '') {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('patients')
    .select(PATIENT_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search.trim()) {
    query = applyPatientSearch(query as any, search) as typeof query
  }

  const { data, error, count } = await query
  if (error) throw error

  return { patients: (data ?? []) as unknown as Patient[], total: count ?? 0 }
}

// Infinite-scroll picker for the order form. Newest first, optional search.
export async function searchPatients(search = '', page = 1, limit = 20) {
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = client
    .from('patients')
    .select(PATIENT_PICKER_SELECT)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search.trim()) {
    query = applyPatientSearch(query as any, search) as typeof query
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as PatientWithInsuranceCompany[]
}

export const getPatient = async (id: string) => {
  const { data, error } = await client
    .from('patients')
    .select(PATIENT_SELECT)
    .eq('id', id)
    .single()

  if (error) return { error: JSON.stringify(error) }
  return { data: data as unknown as Patient }
}
