import { describeError } from "../../../orders/import-core";
import type { SyncEvent } from "../../../types";
import { isSyncStep, runSyncStep } from "../../runners";
import { SYNC_STEPS } from "../../steps";

// Node runtime + no buffering: each line is flushed as it is produced so the
// terminal and the running count update live.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One step of the full sync, streamed as newline-delimited JSON — one
 * {@link SyncEvent} per line.
 *
 * Deliberately one step per request. A single route running all six would put
 * every entity under one request timeout, and the slow ones (patients, orders)
 * would be cut off partway through with the log looking like a crash. Splitting
 * it gives each step its own clock, which is exactly what running the sync by
 * hand used to do — the client just clicks through the list for you.
 *
 * POST-only so it is never prefetched or cached. Auth is enforced inside each
 * importer: every one checks the caller is an admin and returns a failure
 * result rather than throwing, so an unauthorised call streams a refusal
 * instead of a 403, and the client renders it like any other step outcome.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ step: string }> }
) {
  const { step } = await params;

  if (!isSyncStep(step)) {
    return new Response(`Unknown sync step "${step}".`, { status: 404 });
  }

  const label = SYNC_STEPS.find((s) => s.slug === step)?.label ?? step;
  const encoder = new TextEncoder();
  const { signal } = request;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: SyncEvent) => {
        // Once the client disconnects, enqueue throws — ignore it.
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          /* client gone */
        }
      };

      try {
        for await (const event of runSyncStep(step, label, signal)) {
          if (signal.aborted) break;
          send(event);
        }
      } catch (e) {
        if (!signal.aborted) {
          const message = describeError(e);
          console.log(`[sync:${step}] crashed:`, e);
          send({ type: "log", level: "error", message });
          send({
            type: "result",
            result: {
              total: 0,
              imported: 0,
              failed: 1,
              errors: [{ directusId: label, message }],
            },
          });
        }
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // Disable proxy buffering (e.g. nginx) so lines arrive incrementally.
      "X-Accel-Buffering": "no",
    },
  });
}
