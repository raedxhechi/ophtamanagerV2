'use client'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'
import { createBrowserLoggingFetch } from '@/lib/logging/browser'
export function createClient() {
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            global: {
                // Every call this client makes — sign-in, token refresh, and each
                // REST query — is recorded to system_logs with the status it came
                // back with. Instrumenting the transport instead of each function
                // in api/browser means a query added later is covered without
                // anyone remembering to wrap it. See lib/logging/instrument.ts.
                fetch: createBrowserLoggingFetch(),
            },
        }
    )
}
