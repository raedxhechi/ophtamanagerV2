import { Constants } from '@/types/supabase'
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
  typeOfMedicine: z.enum(Constants.public.Enums.medicine_type),
  subOrders: z.array(subOrderSchema),
  confirmRegulations: z.boolean(),
})
