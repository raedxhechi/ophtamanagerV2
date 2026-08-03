import { z } from 'zod'
import { subOrderInpuSchema } from '../schema'

const eyetoggleschema = z.object({
  leftEye: z.boolean().optional(),
  rightEye: z.boolean().optional(),
  id: z.string(),
})
const selectInvoiceSchema = z.object({
  invoice: z.string(),
  id: z.string(),
})

export const availbleSubOrder = subOrderInpuSchema.extend({
  toggleEye: z.function().args(eyetoggleschema),
  selectInvoice: z.function().args(selectInvoiceSchema),
  selectPatient: z.function().args(z.string()),
  disabled: z.boolean().optional(),
})

export type AvailableSubOrder = z.infer<typeof availbleSubOrder>
export type EyeClickedValue = z.infer<typeof eyetoggleschema>
