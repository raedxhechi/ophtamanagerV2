import { MedicineType } from '@/lib/types/types'
import { z } from 'zod'

const today = new Date()

export const subOrderSchema = z.object({
  patientId: z.string(),
  fullName: z.string(),
  dateOfBirth: z.string(),
  ikNumber: z.string().nullable().optional(),
  leftEye: z.boolean(),
  rightEye: z.boolean(),
  invoice: z.string().optional(),
})

export const formSchema = z.object({
  deliveryDate: z.date().min(today),
  applicationDate: z.date().min(today),
  medicine: z.string(),
  typeOfMedicine: z.nativeEnum(MedicineType),
  subOrders: z.array(subOrderSchema),
  confirmRegulations: z.boolean(),
})
