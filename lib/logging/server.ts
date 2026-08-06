import { after } from "next/server";

import type { SystemLogSource } from "@/types/systemLogs";

import { ingestSystemLogs } from "./ingest";
import { createLoggingFetch } from "./instrument";

/**
 * The `fetch` the server-side Supabase clients run on.
 *
 * Server calls skip the queue and the HTTP endpoint entirely — they are already
 * on the server, holding the secret — and write straight through `ingest`. The
 * write is handed to `after()` so it settles once the response has been sent
 * rather than adding its latency to the user's page.
 */
export function createServerLoggingFetch(
  source: Extract<SystemLogSource, "server" | "proxy">,
  context: { userAgent?: string | null; ip?: string | null } = {}
) {
  return createLoggingFetch({
    source,
    deliver: (event) => {
      // The token came out of the request's own cookie jar, and a call that
      // succeeded is a call Supabase accepted that token for — which is the
      // same proof the HTTP endpoint looks for. A failure leaves the identity
      // claimed but unproven, which is exactly the expired-session case.
      const work = ingestSystemLogs([event], {
        verifiedUserId: event.ok ? event.actor.userId : null,
        userAgent: context.userAgent ?? null,
        ip: context.ip ?? null,
      }).catch(() => {
        // A log that can't be written must not take the page down with it.
      });

      try {
        after(work);
      } catch {
        // `after` needs a request scope; outside one (a script, a warm-up) the
        // promise is simply left to settle on its own.
        void work;
      }
    },
  });
}
