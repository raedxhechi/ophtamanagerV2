import type { SystemLogSource } from "@/types/systemLogs";

/**
 * One recorded API call, as produced at the call site (browser, RSC, or
 * middleware) and sent to the ingest endpoint. Deliberately isomorphic: this
 * module is imported by the browser bundle and by server code alike, so it must
 * stay free of anything Node- or DOM-specific.
 */
export type SystemLogEvent = {
  /** Client-assigned id. Makes a retried batch idempotent — see the migration. */
  clientEventId: string;
  /** ISO timestamp of when the call was made, not when it was ingested. */
  occurredAt: string;
  action: string;
  method: string;
  /** Path + query, with the Supabase origin stripped and secrets removed. */
  path: string;
  /** Null when the request never reached the server at all. */
  status: number | null;
  ok: boolean;
  durationMs: number;
  errorCode: string | null;
  errorMessage: string | null;
  source: SystemLogSource;
  /**
   * Who the call belonged to, read out of the request itself (see
   * `actorFromRequest`). The ingest endpoint re-derives this from the session
   * cookie where it can and only trusts what it derived itself.
   */
  actor: SystemLogActor;
  /** True once the entry has been through the offline queue. */
  queued?: boolean;
  metadata?: Record<string, unknown> | null;
};

export type SystemLogActor = {
  userId: string | null;
  email: string | null;
};

export const EMPTY_ACTOR: SystemLogActor = { userId: null, email: null };

// ---------------------------------------------------------------------------
// Action names
// ---------------------------------------------------------------------------

// GoTrue endpoints map to fixed names. /auth/v1/token covers several flows and
// is disambiguated by its grant_type below.
const AUTH_ACTIONS: Record<string, string> = {
  logout: "logout",
  signup: "signUp",
  recover: "requestPasswordReset",
  verify: "verifyOtp",
  otp: "requestOtp",
  resend: "resendConfirmation",
  callback: "authCallback",
  authorize: "authorize",
  magiclink: "requestMagicLink",
};

/**
 * Turn a plural table name into the singular used by get/create/update/delete
 * action names. Only the handful of English rules the schema actually needs —
 * anything unrecognised is left alone, which keeps names like `medicine` and
 * `user_data` intact rather than mangling them.
 */
function singularize(table: string): string {
  if (/ies$/.test(table)) return table.replace(/ies$/, "y");
  if (/(ch|sh|s|x|z)es$/.test(table)) return table.replace(/es$/, "");
  if (/[^s]s$/.test(table)) return table.slice(0, -1);
  return table;
}

/** snake_case -> PascalCase, for splicing a table name into an action name. */
function pascalize(value: string): string {
  return value
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Derive a stable action name from the outgoing request.
 *
 * Naming comes from the request rather than from the call site on purpose: it
 * is impossible to forget to label a new query, it cannot drift from what was
 * actually sent, and two call sites doing the same thing get the same name. The
 * shape matches what the data layer already calls these operations —
 * `listOrders`, `createOrder`, `getPatient`, `login`, `refreshToken`.
 */
export function deriveAction(method: string, url: URL, headers: Headers): string {
  const verb = method.toUpperCase();
  const segments = url.pathname.split("/").filter(Boolean);

  // /auth/v1/<endpoint>
  const authIndex = segments.indexOf("auth");
  if (authIndex !== -1 && segments[authIndex + 2]) {
    const endpoint = segments[authIndex + 2];

    if (endpoint === "token") {
      const grant = url.searchParams.get("grant_type");
      if (grant === "refresh_token") return "refreshToken";
      // password, pkce, id_token — all of them are a sign-in.
      return "login";
    }
    if (endpoint === "user") return verb === "GET" ? "getUser" : "updateUser";
    return AUTH_ACTIONS[endpoint] ?? `auth:${endpoint}`;
  }

  // /rest/v1/<table> and /rest/v1/rpc/<function>
  const restIndex = segments.indexOf("rest");
  if (restIndex !== -1 && segments[restIndex + 2]) {
    if (segments[restIndex + 2] === "rpc") {
      return `rpc:${segments[restIndex + 3] ?? "unknown"}`;
    }

    const table = segments[restIndex + 2];
    const entity = pascalize(singularize(table));
    const plural = pascalize(table);

    switch (verb) {
      case "GET": {
        // `.single()` / `.maybeSingle()` ask PostgREST for an object rather than
        // an array, and a lookup by primary key filters on `id=eq.`. Either one
        // means this fetched one row, so it reads as a `get`, not a `list`.
        const wantsObject = (headers.get("accept") ?? "").includes(
          "vnd.pgrst.object"
        );
        const byId = url.searchParams.get("id")?.startsWith("eq.") ?? false;
        return wantsObject || byId ? `get${entity}` : `list${plural}`;
      }
      case "HEAD":
        return `count${plural}`;
      case "POST": {
        const prefer = headers.get("prefer") ?? "";
        return prefer.includes("resolution=merge-duplicates")
          ? `upsert${entity}`
          : `create${entity}`;
      }
      case "PATCH":
        return `update${entity}`;
      case "PUT":
        return `upsert${entity}`;
      case "DELETE":
        return `delete${entity}`;
      default:
        return `${verb.toLowerCase()}${plural}`;
    }
  }

  return `${verb.toLowerCase()}:${url.pathname}`;
}

// ---------------------------------------------------------------------------
// Attribution
// ---------------------------------------------------------------------------

/** Decode a JWT's payload without verifying it. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    return JSON.parse(
      decodeURIComponent(
        atob(padded)
          .split("")
          .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
          .join("")
      )
    );
  } catch {
    return null;
  }
}

/**
 * Work out who a call belonged to from the request that is about to go out.
 *
 * The access token travels on the request itself, so this works for the case
 * that matters most: a call that comes back 401 *because* the token expired
 * still carries that token, and an expired token names its owner perfectly
 * well. Nothing here is trusted as proof — the token is not verified, and the
 * ingest endpoint marks anything it cannot confirm against a live session as
 * unverified — it is what lets an expired-session error say whose it was.
 *
 * The publishable/anon key is also sent as a bearer token; it either isn't a
 * JWT or carries `role: "anon"`, and is ignored either way.
 */
export function actorFromRequest(
  headers: Headers,
  url: URL,
  body: unknown
): SystemLogActor {
  const authorization = headers.get("authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (token) {
    const payload = decodeJwtPayload(token);
    if (payload && payload.role === "authenticated" && payload.sub) {
      return {
        userId: String(payload.sub),
        email: typeof payload.email === "string" ? payload.email : null,
      };
    }
  }

  // Sign-in has no token yet, and a *failed* sign-in never gets one — but the
  // whole point of logging it is to say whose attempt failed, and the address
  // that was tried is the only identity there is. Only the email is read; the
  // password in the same body is never touched.
  if (url.pathname.endsWith("/auth/v1/token") || url.pathname.endsWith("/auth/v1/signup")) {
    const email = readEmail(body);
    if (email) return { userId: null, email };
  }

  return EMPTY_ACTOR;
}

function readEmail(body: unknown): string | null {
  if (typeof body !== "string") return null;
  try {
    const parsed = JSON.parse(body);
    const email = parsed?.email;
    return typeof email === "string" && email ? email : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// What is worth logging
// ---------------------------------------------------------------------------

/**
 * The log's own traffic, which must never be logged: reading the audit trail
 * from the admin page would otherwise write new rows on every page view.
 * (Those reads are admin traffic and would be dropped at ingest anyway — this
 * just saves the round-trip.)
 */
function isSelfTraffic(url: URL): boolean {
  return (
    url.pathname.includes("/rest/v1/system_logs") ||
    url.pathname.includes("/rest/v1/rpc/system_logs_facets") ||
    url.pathname.includes("/rest/v1/rpc/prune_system_logs")
  );
}

export function shouldLog(
  source: SystemLogSource,
  url: URL,
  ok: boolean
): boolean {
  if (isSelfTraffic(url)) return false;

  // The middleware runs on every navigation and re-validates the session each
  // time, so logging its successes would add a row per page view that says
  // nothing. Its failures are the opposite: they are precisely the expired- and
  // revoked-session events this table exists to explain.
  if (source === "proxy" && ok) return false;

  return true;
}

/**
 * Strip anything sensitive out of the URL before it is stored. Query strings on
 * REST calls are filters, which are useful context, but auth endpoints can
 * carry one-time codes and tokens in the query and those must not be kept.
 */
export function sanitizePath(url: URL): string {
  if (url.pathname.includes("/auth/v1/")) {
    const grant = url.searchParams.get("grant_type");
    return grant ? `${url.pathname}?grant_type=${grant}` : url.pathname;
  }
  return `${url.pathname}${url.search}`;
}
