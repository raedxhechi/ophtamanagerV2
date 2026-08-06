import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

export type AdminClient = SupabaseClient<Database>;

// One stateless client for the whole server process. Unlike the cookie-bound
// clients in server.ts / proxy.ts there is no per-request state to keep apart —
// this one never carries a user session — so re-creating it per call would only
// add churn.
let cached: AdminClient | null = null;

/**
 * Supabase client authenticated with the service role, which bypasses RLS.
 *
 * The system log needs this: a request that fails *because* the user's session
 * expired still has to be recorded, and at that point there is no valid JWT to
 * write with. `system_logs` deliberately has no INSERT policy, so this is the
 * only thing that can write to it.
 *
 * Server-only. `SUPABASE_SECRET` has no NEXT_PUBLIC_ prefix so Next will not
 * inline it into a client bundle, but the explicit guard turns "silently
 * unauthenticated in the browser" into a loud error at the point of misuse.
 */
export function createAdminClient(): AdminClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "createAdminClient() is server-only — it would leak the Supabase secret."
    );
  }

  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET;
  if (!url || !secret) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET must be set to write system logs."
    );
  }

  cached = createClient<Database>(url, secret, {
    auth: {
      // Nothing to persist or refresh: the secret is the credential, and there
      // is no browser storage to write a session into.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return cached;
}
