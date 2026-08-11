import type { SyncEvent } from "../../types";
import { describeError, importOrdersEvents } from "../import-core";

// Node runtime + no buffering: we want each line flushed to the client as it is
// produced so the terminal log and running count update live.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Streams the orders import as newline-delimited JSON ({@link SyncEvent} per
 * line). POST-only so it is never prefetched or cached. Auth is enforced inside
 * the generator. `request.signal` aborts when the client hits Stop (or
 * disconnects), which halts the generator between batches.
 */
export async function POST(request: Request) {
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
        for await (const event of importOrdersEvents(signal)) {
          if (signal.aborted) break;
          send(event);
        }
      } catch (e) {
        if (!signal.aborted) {
          const message = describeError(e);
          // console.log (not console.error) per request — keeps the raw object
          // expandable in the dev console.
          console.log("[orders-sync] import crashed:", e);
          send({ type: "log", level: "error", message });
          send({
            type: "result",
            result: {
              total: 0,
              imported: 0,
              failed: 1,
              errors: [{ directusId: "-", message }],
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
