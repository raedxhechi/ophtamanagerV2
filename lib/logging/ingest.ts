import { createAdminClient } from "@/supabase/admin";
import type { SystemLogInsert, SystemLogSource } from "@/types/systemLogs";
import type { Database } from "@/types/supabase";

import type { SystemLogEvent } from "./event";

/**
 * Server-side ingest for system log events: resolve who each call belonged to,
 * drop the ones made by admins, and write the rest with the service role.
 *
 * Shared by the HTTP endpoint (app/api/system-logs) and by server-side calls,
 * which skip the network hop and come straight here.
 */

// A batch arrives from an endpoint that has to accept unauthenticated callers,
// so everything about it is treated as untrusted: capped in size, and every
// string clipped before it reaches the database.
const MAX_EVENTS_PER_BATCH = 100;
const MAX_ACTION = 200;
const MAX_PATH = 2000;
const MAX_ERROR_MESSAGE = 2000;
const MAX_ERROR_CODE = 100;
const MAX_EMAIL = 320;
const MAX_USER_AGENT = 500;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type UserRole = Database["public"]["Enums"]["user_role"];

type Profile = {
  id: string;
  email: string | null;
  role: UserRole;
  doctor_office_id: string | null;
};

export type IngestContext = {
  /**
   * The user id the endpoint established from the request's own session cookie,
   * or null if there was no usable session. Only an event whose claimed actor
   * matches this is stored as verified.
   */
  verifiedUserId?: string | null;
  userAgent?: string | null;
  ip?: string | null;
};

export type IngestResult = {
  /** Rows sent to the database (a duplicate retry counts as stored). */
  stored: number;
  /** Events dropped because they belong to an admin, or were unusable. */
  skipped: number;
};

// ---------------------------------------------------------------------------
// Profile lookup
// ---------------------------------------------------------------------------

// Roles and offices change rarely, and a busy client can send a batch every few
// seconds, so the same handful of users would otherwise be looked up over and
// over. Misses are cached too — with a shorter life, so a newly created user
// starts resolving quickly — to stop a stream of failed logins for an unknown
// address from hitting the database on every batch.
const HIT_TTL_MS = 5 * 60_000;
const MISS_TTL_MS = 60_000;

const profileCache = new Map<string, { profile: Profile | null; expiresAt: number }>();

function readCache(key: string): { profile: Profile | null } | undefined {
  const entry = profileCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    profileCache.delete(key);
    return undefined;
  }
  return entry;
}

function writeCache(key: string, profile: Profile | null) {
  profileCache.set(key, {
    profile,
    expiresAt: Date.now() + (profile ? HIT_TTL_MS : MISS_TTL_MS),
  });
}

/**
 * Resolve the user_data rows behind a batch's actors, by id and by email, in at
 * most two queries. Emails matter on their own: a sign-in that fails never
 * produces a user id, and the address that was tried is the only thing that can
 * say whose attempt it was.
 */
async function resolveProfiles(
  ids: Set<string>,
  emails: Set<string>
): Promise<{ byId: Map<string, Profile>; byEmail: Map<string, Profile> }> {
  const byId = new Map<string, Profile>();
  const byEmail = new Map<string, Profile>();

  const missingIds: string[] = [];
  for (const id of ids) {
    const cached = readCache(`id:${id}`);
    if (cached) {
      if (cached.profile) byId.set(id, cached.profile);
    } else {
      missingIds.push(id);
    }
  }

  const missingEmails: string[] = [];
  for (const email of emails) {
    const cached = readCache(`email:${email}`);
    if (cached) {
      if (cached.profile) byEmail.set(email, cached.profile);
    } else {
      missingEmails.push(email);
    }
  }

  if (!missingIds.length && !missingEmails.length) return { byId, byEmail };

  const admin = createAdminClient();
  const select = "id, email, role, doctor_office_id";

  if (missingIds.length) {
    const { data } = await admin.from("user_data").select(select).in("id", missingIds);
    const found = new Map((data ?? []).map((row) => [row.id, row as Profile]));
    for (const id of missingIds) {
      const profile = found.get(id) ?? null;
      writeCache(`id:${id}`, profile);
      if (profile) byId.set(id, profile);
    }
  }

  if (missingEmails.length) {
    const { data } = await admin
      .from("user_data")
      .select(select)
      .in("email", missingEmails);
    const found = new Map(
      (data ?? [])
        .filter((row) => row.email)
        .map((row) => [row.email!.toLowerCase(), row as Profile])
    );
    for (const email of missingEmails) {
      const profile = found.get(email) ?? null;
      writeCache(`email:${email}`, profile);
      if (profile) byEmail.set(email, profile);
    }
  }

  return { byId, byEmail };
}

/** Drop a user from the cache so their next log picks up a changed role/office. */
export function forgetCachedProfile(userId: string, email?: string | null) {
  profileCache.delete(`id:${userId}`);
  if (email) profileCache.delete(`email:${email.toLowerCase()}`);
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

function truncate(value: unknown, max: number): string | null {
  if (typeof value !== "string" || !value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

function toTimestamp(value: unknown): string {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    // A queued entry carries the time it was made, which may be well in the
    // past. Times in the future are the one thing rejected: a client with a
    // skewed clock would otherwise pin itself to the top of the log forever.
    if (!Number.isNaN(parsed) && parsed <= Date.now() + 60_000) {
      return new Date(parsed).toISOString();
    }
  }
  return new Date().toISOString();
}

function toStatus(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const status = Math.trunc(value);
  return status >= 100 && status <= 599 ? status : null;
}

function toSource(value: unknown): SystemLogSource {
  return value === "server" || value === "proxy" ? value : "browser";
}

// ---------------------------------------------------------------------------
// Ingest
// ---------------------------------------------------------------------------

export async function ingestSystemLogs(
  events: unknown,
  context: IngestContext = {}
): Promise<IngestResult> {
  if (!Array.isArray(events) || !events.length) return { stored: 0, skipped: 0 };

  const batch = events.slice(0, MAX_EVENTS_PER_BATCH) as SystemLogEvent[];
  const usable = batch.filter(
    (event) => event && typeof event === "object" && typeof event.action === "string"
  );
  let skipped = batch.length - usable.length;

  const ids = new Set<string>();
  const emails = new Set<string>();
  for (const event of usable) {
    const userId = event.actor?.userId;
    if (typeof userId === "string" && UUID_RE.test(userId)) ids.add(userId);
    const email = event.actor?.email;
    if (typeof email === "string" && email) emails.add(email.toLowerCase());
  }

  const { byId, byEmail } = await resolveProfiles(ids, emails);

  const verifiedUserId = context.verifiedUserId ?? null;
  const userAgent = truncate(context.userAgent, MAX_USER_AGENT);
  const ip = truncate(context.ip, 100);

  const rows: SystemLogInsert[] = [];

  for (const event of usable) {
    const claimedId =
      typeof event.actor?.userId === "string" && UUID_RE.test(event.actor.userId)
        ? event.actor.userId
        : null;
    const claimedEmail = truncate(event.actor?.email?.toLowerCase(), MAX_EMAIL);

    const profile =
      (claimedId ? byId.get(claimedId) : undefined) ??
      (claimedEmail ? byEmail.get(claimedEmail) : undefined) ??
      null;

    // The whole point of the table is what everyone *except* admins is doing.
    // Filtering here rather than at each call site means it holds however the
    // event was produced, and can never be forgotten in a new one.
    if (profile?.role === "admin") {
      skipped += 1;
      continue;
    }

    rows.push({
      occurred_at: toTimestamp(event.occurredAt),
      // user_id is only ever a real user_data row, so the foreign key can't
      // reject a log; an unrecognised actor keeps their email and nothing else.
      user_id: profile?.id ?? null,
      user_email: profile?.email ?? claimedEmail,
      doctor_office_id: profile?.doctor_office_id ?? null,
      user_role: profile?.role ?? null,
      // Verified only when the endpoint proved the identity from the request's
      // own session. An expired session leaves the claim standing but unproven,
      // which is exactly the case worth flagging in the UI.
      actor_verified: Boolean(
        verifiedUserId && claimedId && verifiedUserId === claimedId
      ),
      action: truncate(event.action, MAX_ACTION) ?? "unknown",
      method: truncate(event.method, 10),
      path: truncate(event.path, MAX_PATH),
      status: toStatus(event.status),
      ok: event.ok === true,
      duration_ms:
        typeof event.durationMs === "number" && Number.isFinite(event.durationMs)
          ? Math.max(0, Math.trunc(event.durationMs))
          : null,
      error_code: truncate(event.errorCode, MAX_ERROR_CODE),
      error_message: truncate(event.errorMessage, MAX_ERROR_MESSAGE),
      source: toSource(event.source),
      // A client that sent a malformed id gets a fresh one rather than losing
      // the entry; it simply won't dedupe if that client retries.
      client_event_id:
        typeof event.clientEventId === "string" && UUID_RE.test(event.clientEventId)
          ? event.clientEventId
          : crypto.randomUUID(),
      queued: event.queued === true,
      user_agent: userAgent,
      ip,
      metadata: (event.metadata as SystemLogInsert["metadata"]) ?? null,
    });
  }

  if (!rows.length) return { stored: 0, skipped };

  // ignoreDuplicates makes a replayed batch a no-op: the offline queue resends
  // anything it never saw acknowledged, which includes calls that did land but
  // whose response was lost on the way back.
  const { error } = await createAdminClient()
    .from("system_logs")
    .upsert(rows, { onConflict: "client_event_id", ignoreDuplicates: true });

  if (error) throw error;

  return { stored: rows.length, skipped };
}
