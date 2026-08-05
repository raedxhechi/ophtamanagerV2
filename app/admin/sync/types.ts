export type SyncCounts = {
  directus: number;
  supabase: number;
  /** Optional secondary metric shown under each main count (e.g. suborders). */
  secondary?: { label: string; directus: number; supabase: number };
};

export type ImportError = { directusId: string | number; message: string };

/** A non-fatal issue — e.g. a referenced row not yet copied to Supabase. */
export type ImportWarning = { directusId: string | number; message: string };

export type ImportResult = {
  total: number;
  imported: number;
  failed: number;
  errors: ImportError[];
  /** Unresolved connections and other non-fatal issues. */
  warnings?: ImportWarning[];
};

export type SyncLogLevel = "info" | "success" | "warn" | "error";

/**
 * A single event streamed from a live import (NDJSON, one JSON object per line):
 * `log` lines feed the terminal box, `progress` drives the running count, and a
 * final `result` carries the same {@link ImportResult} the non-streaming path
 * returns.
 */
export type SyncEvent =
  | { type: "log"; level: SyncLogLevel; message: string }
  | { type: "progress"; imported: number; failed: number; total: number }
  | { type: "result"; result: ImportResult };

/** Shared "not authenticated / not allowed / crashed" result. */
export function failResult(message: string): ImportResult {
  return {
    total: 0,
    imported: 0,
    failed: 1,
    errors: [{ directusId: "-", message }],
  };
}
