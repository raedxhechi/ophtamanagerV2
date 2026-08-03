import { InsurancePolicy, Medicine } from '@/lib/types/types'
type MedicineRecord = Record<number, Medicine[]>

export function mergeMedicines(insurancePolicies?: InsurancePolicy[]): MedicineRecord {
  if (!insurancePolicies) {
    return []
  }
  const input: Record<number, Medicine[]>[] = insurancePolicies?.map((policy) => {
    const companiesIds = policy.insuranceCompanies
      .map((item) => item.insuranceCompanies_id?.id)
      .filter((item) => !!item)
    const medicines = policy.medicines.map((med) => med.medicines_id)
    const res = companiesIds.reduce<Record<number, Medicine[]>>((acc, num) => {
      acc[num] = medicines // Assign all medicines to the current number
      return acc
    }, {})
    return res
  })
  const result: MedicineRecord = {}

  input.forEach((record) => {
    Object.entries(record).forEach(([key, medicines]) => {
      const numKey = Number(key)

      if (!result[numKey]) {
        result[numKey] = []
      }

      const existingIds = new Set(result[numKey].map((med) => med.id))

      medicines.forEach((medicine) => {
        if (!existingIds.has(medicine.id)) {
          result[numKey].push(medicine)
          existingIds.add(medicine.id)
        }
      })
    })
  })

  return result
}


