import { InsurancePolicyWithRelations, Medicine } from '@/types'

// Insurance company id (uuid) -> the medicines available to that company.
type MedicineRecord = Record<string, Medicine[]>

export function mergeMedicines(
  insurancePolicies?: InsurancePolicyWithRelations[]
): MedicineRecord {
  const result: MedicineRecord = {}
  if (!insurancePolicies) {
    return result
  }

  insurancePolicies.forEach((policy) => {
    const companyIds = policy.insurance_policy_insurance_companies
      .map((item) => item.insurance_companies?.id)
      .filter((id): id is string => !!id)
    const medicines = policy.insurance_policy_medicines
      .map((item) => item.medicine)
      .filter((med): med is Medicine => !!med)

    companyIds.forEach((companyId) => {
      if (!result[companyId]) {
        result[companyId] = []
      }

      const existingIds = new Set(result[companyId].map((med) => med.id))

      medicines.forEach((medicine) => {
        if (!existingIds.has(medicine.id)) {
          result[companyId].push(medicine)
          existingIds.add(medicine.id)
        }
      })
    })
  })

  return result
}


