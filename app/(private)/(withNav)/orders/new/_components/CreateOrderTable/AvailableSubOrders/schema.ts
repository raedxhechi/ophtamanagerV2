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
  // Zod v4 dropped the `.args()` builder; model these callbacks with z.custom.
  toggleEye: z.custom<(value: EyeClickedValue) => void>((val) => typeof val === 'function'),
  selectInvoice: z.custom<(value: z.infer<typeof selectInvoiceSchema>) => void>(
    (val) => typeof val === 'function'
  ),
  selectPatient: z.custom<(id: string) => void>((val) => typeof val === 'function'),
  disabled: z.boolean().optional(),
})

export type AvailableSubOrder = z.infer<typeof availbleSubOrder>
export type EyeClickedValue = z.infer<typeof eyetoggleschema>
