import { z } from 'zod'
import { subOrderInpuSchema } from '../schema'

export const addedSubOrder = subOrderInpuSchema.extend({
  removePatient: z.function().args(z.string()),
  editPatient: z.function().args(z.string()),
  added: z.boolean(),
  number: z.number().optional(),
})
export type AddedSubOrder = z.infer<typeof addedSubOrder>
