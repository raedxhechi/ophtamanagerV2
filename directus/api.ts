'use client'

import {
  createDirectus,
  rest,
  staticToken,
} from '@directus/sdk'

export const client = createDirectus(process.env.DIRECTUS_API_URL as string)
  .with(staticToken(process.env.DIRECTUS_ADMIN_STATIC_TOKEN as string))
  .with(rest())