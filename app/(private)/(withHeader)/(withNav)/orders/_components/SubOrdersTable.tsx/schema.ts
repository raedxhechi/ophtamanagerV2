import { z } from 'zod'

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.

export const subOrderSchema = z.object({
  id: z.number(),
  leftEye: z.boolean(),
  rightEye: z.boolean(),
  medicine: z.string(),
  deliveryDate: z.string(),
  applicationDate: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.date(),
  invoice: z.string().optional().nullable(),
})

export type OrderSubOrderTableItem = z.infer<typeof subOrderSchema>
