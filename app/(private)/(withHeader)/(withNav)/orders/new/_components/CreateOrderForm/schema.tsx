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
  // Every suborder has to name who gets invoiced before the order can be
  // placed. Parking a draft skips validation, so drafts stay exempt.
  invoice: z.enum(Constants.public.Enums.invoice_types),
})

export const formSchema = z.object({
  deliveryDate: z.date().min(today),
  applicationDate: z.date().min(today),
  medicine: z.string(),
  typeOfMedicine: z.enum(Constants.public.Enums.medicine_type),
  subOrders: z.array(subOrderSchema),
  confirmRegulations: z.boolean(),
})
