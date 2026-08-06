import type { SystemLogEvent } from "./event";

/**
 * Durable, offline-tolerant outbox for system log events.
 *
 * Every event is written to storage *before* any attempt to send it, so an
 * entry survives a lost connection, a reload, a crash, or the tab being closed
 * mid-flight; it is only removed once the server has acknowledged it. Retries
 * are safe because each event carries a `clientEventId` and the table has a
 * unique index on it — a batch that landed but whose response was lost gets
 * dropped server-side on the replay rather than stored twice.
 *
 * localStorage rather than a cookie: cookies are capped around 4KB, are sent up
 * with every single request to the app (including the ones being logged), and
 * would be a poor place to park a backlog of a few hundred entries. localStorage
 * has ~5MB, is never transmitted, and survives the same events a cookie does.
 */

const STORAGE_KEY = "optamanager.systemLogs.queue";
const DROPPED_KEY = "optamanager.systemLogs.dropped";
const ENDPOINT = "/api/system-logs";

/**
 * How much backlog to keep. At ~400 bytes an entry this is well under the
 * storage budget, and it bounds what an app left open offline for a long time
 * can accumulate. Past it the oldest entries go first — a gap in the middle of
 * an audit trail is worse than a truncated start.
 */
const MAX_QUEUED = 500;
const BATCH_SIZE = 50;
/** Coalesces the burst of calls a single page load makes into one request. */
const FLUSH_DEBOUNCE_MS = 1500;
const FLUSH_INTERVAL_MS = 30_000;

/**
 * How long an entry has to linger before it counts as *held back* rather than
 * merely batched. Everything goes through the queue, so the flag is only worth
 * anything if it marks the entries that actually waited on something — a lost
 * connection, a closed tab — rather than the ordinary flush delay. Comfortably
 * above FLUSH_INTERVAL_MS so a routine tick never trips it.
 */
const QUEUED_AFTER_MS = 60_000;

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function read(): SystemLogEvent[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(events: SystemLogEvent[]) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Quota exhausted or storage disabled (private mode). Nothing useful to do:
    // the app must keep working, so the entry is lost rather than raised.
  }
}

function countDropped(): number {
  if (!hasStorage()) return 0;
  return Number(window.localStorage.getItem(DROPPED_KEY)) || 0;
}

function setDropped(count: number) {
  if (!hasStorage()) return;
  try {
    if (count > 0) window.localStorage.setItem(DROPPED_KEY, String(count));
    else window.localStorage.removeItem(DROPPED_KEY);
  } catch {
    /* see write() */
  }
}

/**
 * Queue an event and schedule a send.
 *
 * Called from the instrumented fetch, so it has to be cheap and must never
 * throw — a failure to log cannot be allowed to break the call being logged.
 */
export function enqueueSystemLogEvent(event: SystemLogEvent) {
  if (!hasStorage()) return;

  try {
    const queue = read();
    queue.push(event);

    if (queue.length > MAX_QUEUED) {
      const removed = queue.splice(0, queue.length - MAX_QUEUED);
      // Carried on the next surviving entry so the gap is visible in the admin
      // UI instead of silently swallowed.
      setDropped(countDropped() + removed.length);
    }

    const dropped = countDropped();
    if (dropped > 0) {
      event.metadata = { ...(event.metadata ?? {}), droppedBeforeThis: dropped };
      setDropped(0);
    }

    write(queue);
    scheduleFlush();
  } catch {
    /* never let logging break the caller */
  }
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

let flushing = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (debounceTimer) return;
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushSystemLogQueue();
  }, FLUSH_DEBOUNCE_MS);
}

/**
 * Stamp an event with whether it was held back before it went out. Decided at
 * send time rather than at enqueue time, because that is the only moment the
 * answer is actually known.
 */
function withDeliveryDelay(event: SystemLogEvent): SystemLogEvent {
  const occurredAt = Date.parse(event.occurredAt);
  const delayed =
    !Number.isNaN(occurredAt) && Date.now() - occurredAt > QUEUED_AFTER_MS;
  return delayed ? { ...event, queued: true } : event;
}

/** Remove by id, not by index: another tab may have written in the meantime. */
function acknowledge(batch: SystemLogEvent[]) {
  const sent = new Set(batch.map((event) => event.clientEventId));
  write(read().filter((event) => !sent.has(event.clientEventId)));
}

export async function flushSystemLogQueue(): Promise<void> {
  if (flushing || !hasStorage()) return;
  // Skip the round-trip when the browser already knows it is offline; the
  // backlog stays put and the `online` listener will come back for it.
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  flushing = true;
  try {
    // Drains in batches so a long backlog (a laptop reopened after a day
    // offline) goes up in bounded requests rather than one huge one.
    for (;;) {
      const queue = read();
      if (!queue.length) return;

      const batch = queue.slice(0, BATCH_SIZE);
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events: batch.map(withDeliveryDelay) }),
        credentials: "same-origin",
        keepalive: true,
      });

      if (response.ok) {
        acknowledge(batch);
        continue;
      }

      // A 4xx means the server understood and refused: retrying would wedge the
      // whole queue behind a batch that can never land, so it is dropped. A 5xx
      // is transient — leave it queued and try again on the next trigger.
      if (response.status >= 400 && response.status < 500) acknowledge(batch);
      return;
    }
  } catch {
    // Offline or the request was cut short. The batch is still in storage, so
    // it goes out on the next trigger.
  } finally {
    flushing = false;
  }
}

/**
 * Last-ditch send as the page goes away. `sendBeacon` is the only transport the
 * browser reliably completes during unload, but it reports nothing back, so the
 * batch stays queued — if it did land, the replay is deduplicated server-side
 * by `client_event_id`, and if it didn't, nothing was lost.
 */
function beaconFlush() {
  if (!hasStorage() || typeof navigator === "undefined" || !navigator.sendBeacon) {
    return;
  }
  try {
    const batch = read().slice(0, BATCH_SIZE);
    if (!batch.length) return;
    navigator.sendBeacon(
      ENDPOINT,
      new Blob([JSON.stringify({ events: batch.map(withDeliveryDelay) })], {
        type: "application/json",
      })
    );
  } catch {
    /* nothing more to try on the way out */
  }
}

let started = false;

/**
 * Wire up the flush triggers. Idempotent, so mounting the flusher twice (React
 * strict mode, a re-render) doesn't stack listeners or intervals.
 */
export function startSystemLogQueue(): () => void {
  if (started || typeof window === "undefined") return () => {};
  started = true;

  // Anything left from a previous session — a tab closed offline, a crash —
  // goes out as soon as the app is up again.
  void flushSystemLogQueue();

  const onOnline = () => void flushSystemLogQueue();
  const onVisibility = () => {
    if (document.visibilityState === "hidden") beaconFlush();
    else void flushSystemLogQueue();
  };

  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", beaconFlush);

  const interval = setInterval(() => void flushSystemLogQueue(), FLUSH_INTERVAL_MS);

  return () => {
    started = false;
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", beaconFlush);
    clearInterval(interval);
  };
}
