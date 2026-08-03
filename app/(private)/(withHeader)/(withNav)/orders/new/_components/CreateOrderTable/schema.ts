
import { z } from 'zod'


// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.

export const subOrderInpuSchema = z.object({
  searchText: z.string().optional(),
  // number: z.number().optional(),
  patientId: z.string(),
  fullName: z.string(),
  typeOfInsurance: z.enum(['Gesetzlich', 'Privat']).optional(),
  ikNumber: z.string().optional().nullable(),
  dateOfBirth: z.string(),
  invoice: z.string().optional(),
  leftEye: z.boolean().optional(),
  rightEye: z.boolean().optional(),
  insuranceCompany: z.any().optional().nullable(),
})

export type SubOrderInput = z.infer<typeof subOrderInpuSchema>
