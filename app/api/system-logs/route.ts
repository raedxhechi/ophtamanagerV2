import { NextResponse, type NextRequest } from "next/server";

import { ingestSystemLogs } from "@/lib/logging/ingest";
import { createRawClient } from "@/supabase/server";

/**
 * Ingest endpoint for the browser's system log queue.
 *
 * Deliberately open to unauthenticated callers. The entries that matter most
 * are the ones written when the caller's session has just expired or been
 * revoked — requiring a valid session to report a session failure would lose
 * exactly the events the audit trail exists for. The writes go through the
 * service role (see supabase/admin.ts), which is why the table has no INSERT
 * policy: a signed-in user cannot write to it directly, forged or otherwise.
 *
 * The trade-off is that a caller can claim to be someone else. Every event is
 * therefore stored with `actor_verified`, set only when the identity on the
 * event matches the one this endpoint independently derived from the request's
 * own session cookie. The admin UI shows unverified rows as claimed.
 */

// The queue sends at most 50 events a batch; this leaves generous headroom
// while keeping a single request from being used to push arbitrary data.
const MAX_BODY_BYTES = 256 * 1024;

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload too large" }, { status: 413 });
  }

  let payload: { events?: unknown };
  try {
    payload = JSON.parse(raw);
  } catch {
    // 400 rather than 500: the queue drops a batch the server refuses outright,
    // which is what should happen to one it can never parse.
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!Array.isArray(payload?.events)) {
    return NextResponse.json({ error: "events must be an array" }, { status: 400 });
  }

  // Independently establish who is calling. An uninstrumented client on
  // purpose: the ordinary server client would log this lookup, and every log
  // batch would then produce another log entry describing itself.
  let verifiedUserId: string | null = null;
  try {
    const supabase = await createRawClient();
    const { data } = await supabase.auth.getClaims();
    const sub = data?.claims?.sub;
    verifiedUserId = typeof sub === "string" ? sub : null;
  } catch {
    // No session, or an expired one. Expected — the events still get stored,
    // just with their actor marked as claimed rather than verified.
  }

  try {
    const result = await ingestSystemLogs(payload.events, {
      verifiedUserId,
      userAgent: request.headers.get("user-agent"),
      // First hop in the chain is the client; the rest are proxies.
      ip:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip"),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // 5xx so the queue keeps the batch and retries rather than discarding it.
    console.error("system-logs ingest failed", error);
    return NextResponse.json({ error: "ingest failed" }, { status: 500 });
  }
}
