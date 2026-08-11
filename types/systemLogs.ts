import type { Database } from "./supabase";

/** Where a logged call was made from. */
export type SystemLogSource = "browser" | "server" | "proxy";

/**
 * A row from public.system_logs.
 *
 * `source` is a check constraint rather than an enum (so a new source is a
 * one-line migration), which typegen can only see as `string` — narrowed here
 * to the three values the constraint actually allows.
 */
export type SystemLogRow = Omit<
  Database["public"]["Tables"]["system_logs"]["Row"],
  "source"
> & { source: SystemLogSource };

export type SystemLogInsert =
  Database["public"]["Tables"]["system_logs"]["Insert"];

// ---------------------------------------------------------------------------
// Shapes returned by system_logs_facets
// ---------------------------------------------------------------------------
// The function returns jsonb, so typegen can only type it as `Json`. These are
// the shapes it actually builds — see the migration.

/** One status tab: how many rows carry this status under the other filters. */
export type SystemLogStatusFacet = { status: number | null; count: number };

/** One entry of the action filter, with its count under the other filters. */
export type SystemLogActionFacet = { action: string; count: number };

export type SystemLogFacets = {
  statuses: SystemLogStatusFacet[];
  actions: SystemLogActionFacet[];
  /** Rows matching *every* active filter — the count the table pages through. */
  total: number;
};
