'use server'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import type { Database } from '@/types/supabase'
import { createServerLoggingFetch } from '@/lib/logging/server'

async function cookieOptions() {
    const cookieStore = await cookies()
    return {
        getAll() {
            return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
            try {
                cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
                // The `setAll` method was called from a Server Component.
                // This can be ignored if you have middleware refreshing
                // user sessions.
            }
        },
    }
}

export async function createClient() {
    const headerStore = await headers()
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: await cookieOptions(),
            global: {
                // Server-rendered queries are logged too — the list pages fetch
                // their rows here, not in the browser, so leaving this client
                // uninstrumented would leave listOrders/listPatients out of the
                // audit trail entirely. See lib/logging/server.ts.
                fetch: createServerLoggingFetch('server', {
                    userAgent: headerStore.get('user-agent'),
                    ip:
                        headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ??
                        headerStore.get('x-real-ip'),
                }),
            },
        }
    )
}

/**
 * The same client with logging left off.
 *
 * Only for the log ingest endpoint's own session check: routed through the
 * instrumented client above, that lookup would itself be logged, and every
 * batch of logs would write another entry describing the act of storing it.
 */
export async function createRawClient() {
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { cookies: await cookieOptions() }
    )
}
