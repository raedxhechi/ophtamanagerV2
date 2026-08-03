import { z } from 'zod'
import { subOrderInpuSchema } from '../schema'

export const addedSubOrder = subOrderInpuSchema.extend({
  // Zod v4 dropped the `.args()` builder; model these callbacks with z.custom.
  removePatient: z.custom<(id: string) => void>((val) => typeof val === 'function'),
  editPatient: z.custom<(id: string) => void>((val) => typeof val === 'function'),
  added: z.boolean(),
  number: z.number().optional(),
})
export type AddedSubOrder = z.infer<typeof addedSubOrder>
