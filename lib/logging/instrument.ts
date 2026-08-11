import type { SystemLogSource } from "@/types/systemLogs";

import {
  actorFromRequest,
  deriveAction,
  sanitizePath,
  shouldLog,
  type SystemLogEvent,
} from "./event";

/**
 * A `fetch` that records every Supabase call it makes.
 *
 * Instrumenting at the transport rather than wrapping each function in
 * `api/browser/*` is what makes the log complete: a query added later is
 * captured without anyone remembering to wrap it, the status is the real HTTP
 * status rather than a guess reconstructed from an error object, and the access
 * token is right there on the request, which is what lets a call that failed
 * *because* the session expired still say whose session it was.
 */
export type LoggingFetchOptions = {
  source: SystemLogSource;
  /**
   * Hands the finished event off for storage. Never awaited by the caller's
   * request, and must not throw — logging cannot be allowed to break the call
   * it is describing.
   */
  deliver: (event: SystemLogEvent) => void;
};

type FetchFn = typeof fetch;

/** Bodies are only read for the calls whose outcome isn't clear from the status. */
const AUTH_PATH = "/auth/v1/";
const MAX_ERROR_BODY_BYTES = 8_000;

export function createLoggingFetch(
  options: LoggingFetchOptions,
  baseFetch: FetchFn = fetch
): FetchFn {
  const { source, deliver } = options;

  return async function loggingFetch(input, init) {
    // Read the request without constructing a `Request`, which would consume a
    // streamed body. supabase-js always calls fetch with a string URL and a
    // string body, so these are cheap reads.
    const url = resolveUrl(input);
    const method = (
      init?.method ??
      (typeof input === "object" && "method" in input ? input.method : "GET")
    ).toUpperCase();

    if (!url) return baseFetch(input as RequestInfo, init);

    const headers = new Headers(
      init?.headers ??
        (typeof input === "object" && "headers" in input ? input.headers : undefined)
    );

    const startedAt = Date.now();
    const clock = typeof performance !== "undefined" ? performance.now() : startedAt;

    let response: Response;
    try {
      response = await baseFetch(input as RequestInfo, init);
    } catch (error) {
      // The request never reached the server: offline, DNS, aborted. Recorded
      // with a null status, then queued like any other event — which is the
      // case the offline queue exists for, since this one can't be delivered
      // right now either.
      if (shouldLog(source, url, false)) {
        deliver(
          buildEvent({
            source,
            url,
            method,
            headers,
            body: init?.body,
            startedAt,
            durationMs: elapsed(clock),
            status: null,
            ok: false,
            errorCode: "network_error",
            errorMessage: error instanceof Error ? error.message : String(error),
          })
        );
      }
      throw error;
    }

    if (!shouldLog(source, url, response.ok)) return response;

    const event = buildEvent({
      source,
      url,
      method,
      headers,
      body: init?.body,
      startedAt,
      durationMs: elapsed(clock),
      status: response.status,
      ok: response.ok,
      errorCode: null,
      errorMessage: null,
    });

    // A failure's reason lives in its body (`PGRST116`, `42501`,
    // `invalid_grant`), and a successful sign-in's body is the only place the
    // new user id appears. Cloned synchronously — before the caller can start
    // reading — and parsed off to the side, so the caller's response is handed
    // back untouched and undelayed.
    const wantsBody =
      !response.ok || (url.pathname.includes(AUTH_PATH) && response.ok);

    if (wantsBody) {
      readJson(response.clone())
        .then((json) => {
          if (json) enrichFromBody(event, json, response.ok);
        })
        .catch(() => {})
        .finally(() => deliver(event));
    } else {
      deliver(event);
    }

    return response;
  };
}

function resolveUrl(input: RequestInfo | URL): URL | null {
  try {
    if (typeof input === "string") return new URL(input);
    if (input instanceof URL) return input;
    return new URL(input.url);
  } catch {
    return null;
  }
}

function elapsed(from: number): number {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  return Math.max(0, Math.round(now - from));
}

function buildEvent(args: {
  source: SystemLogSource;
  url: URL;
  method: string;
  headers: Headers;
  body: BodyInit | null | undefined;
  startedAt: number;
  durationMs: number;
  status: number | null;
  ok: boolean;
  errorCode: string | null;
  errorMessage: string | null;
}): SystemLogEvent {
  return {
    clientEventId: crypto.randomUUID(),
    occurredAt: new Date(args.startedAt).toISOString(),
    action: deriveAction(args.method, args.url, args.headers),
    method: args.method,
    path: sanitizePath(args.url),
    status: args.status,
    ok: args.ok,
    durationMs: args.durationMs,
    errorCode: args.errorCode,
    errorMessage: args.errorMessage,
    source: args.source,
    actor: actorFromRequest(args.headers, args.url, args.body),
    metadata: null,
  };
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const text = await response.text();
    if (!text || text.length > MAX_ERROR_BODY_BYTES) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Fill in what only the response body knows: the error's code and message when
 * the call failed, and — on a successful sign-in, where the request carried no
 * token yet — the id of the user who just signed in.
 */
function enrichFromBody(
  event: SystemLogEvent,
  json: Record<string, unknown>,
  ok: boolean
) {
  if (!ok) {
    // PostgREST returns { code, message, details, hint }; GoTrue returns
    // { error_code | error, msg | message | error_description }.
    event.errorCode = firstString(json, ["code", "error_code", "error"]);
    event.errorMessage = firstString(json, [
      "message",
      "msg",
      "error_description",
      "details",
    ]);
    return;
  }

  if (!event.actor.userId) {
    const user = (json.user ?? json) as Record<string, unknown> | undefined;
    if (user && typeof user.id === "string") {
      event.actor = {
        userId: user.id,
        email: typeof user.email === "string" ? user.email : event.actor.email,
      };
    }
  }
}

function firstString(
  json: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = json[key];
    if (typeof value === "string" && value) return value;
    if (typeof value === "number") return String(value);
  }
  return null;
}
