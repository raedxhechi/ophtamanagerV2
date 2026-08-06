import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/supabase/server";
import type { Database } from "@/types/supabase";
import type { SystemLogFacets, SystemLogRow } from "@/types/systemLogs";

import { LogsBrowser } from "./LogsBrowser";
import type { LogUser, OfficeOption } from "./types";

const PAGE_SIZE = 100;

export type LogsFilters = {
  office: string;
  user: string;
  action: string;
  /** HTTP status tab, or "none" for calls that never reached the server. */
  status: string;
  search: string;
  page: number;
};

/**
 * The suspending half of the logs page: the admin check and every query live
 * here so the shell around it renders immediately. The page keys its Suspense
 * boundary on the active filters, so changing one swaps this for the skeleton
 * instead of sitting on stale rows.
 */
export async function LogsData({ filters }: { filters: LogsFilters }) {
  const supabase = await createClient();

  // RLS already limits every query below to admins — a non-admin would simply
  // get empty results. Checking explicitly turns that silence into a clear
  // answer instead of an empty page that looks like "no activity yet".
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return (
      <p className="text-muted-foreground text-sm">
        You need an admin account to view the system logs.
      </p>
    );
  }

  const office = filters.office || null;
  const user = filters.user || null;
  const action = filters.action || null;
  const search = filters.search || null;
  // "none" is its own tab: a call that never reached the server has no status,
  // and `null` in the filter would otherwise read as "no status filter".
  const statusFilter =
    filters.status === "none"
      ? { kind: "null" as const }
      : filters.status
        ? { kind: "value" as const, value: Number(filters.status) }
        : { kind: "any" as const };

  const [offices, users, facets, logs] = await Promise.all([
    loadOffices(supabase),
    loadUsers(supabase, office),
    loadFacets(supabase, { office, user, action, statusFilter, search }),
    loadLogs(supabase, { office, user, action, statusFilter, search, page: filters.page }),
  ]);

  return (
    <LogsBrowser
      filters={filters}
      offices={offices}
      users={users}
      facets={facets}
      logs={logs.rows}
      totalCount={logs.total}
      pageCount={Math.max(1, Math.ceil(logs.total / PAGE_SIZE))}
      pageSize={PAGE_SIZE}
      error={logs.error}
    />
  );
}

type Client = SupabaseClient<Database, "public">;
type StatusFilter =
  | { kind: "any" }
  | { kind: "null" }
  | { kind: "value"; value: number };

async function loadOffices(supabase: Client): Promise<OfficeOption[]> {
  const { data } = await supabase
    .from("doctor_office")
    .select("id, name")
    .order("name");
  return data ?? [];
}

/**
 * The people the log is about. Admins are left out because their calls are
 * never recorded in the first place, so listing them would only offer filters
 * that can't match anything.
 */
async function loadUsers(supabase: Client, office: string | null): Promise<LogUser[]> {
  let query = supabase
    .from("user_data")
    .select("id, email, first_name, last_name, role, doctor_office_id, doctor_office:doctor_office_id(name)")
    .neq("role", "admin")
    .order("last_name", { nullsFirst: false })
    .order("email");

  if (office) query = query.eq("doctor_office_id", office);

  const { data } = await query;
  return ((data ?? []) as unknown as LogUser[]) ?? [];
}

/**
 * Counts for the status tabs and the action dropdown, in one round-trip. Each
 * facet ignores its own filter, so standing on the 401 tab still shows how many
 * 200s there are for the same user and action.
 */
async function loadFacets(
  supabase: Client,
  args: {
    office: string | null;
    user: string | null;
    action: string | null;
    statusFilter: StatusFilter;
    search: string | null;
  }
): Promise<SystemLogFacets> {
  // Omitted rather than passed as null: each argument defaults to null in SQL,
  // which is what "no filter" means there.
  const { data } = await supabase.rpc("system_logs_facets", {
    p_office: args.office ?? undefined,
    p_user: args.user ?? undefined,
    p_action: args.action ?? undefined,
    // The RPC has no way to express "status is null", so the `none` tab is
    // applied to the rows but not to the facet counts — the tabs stay stable
    // while it is selected, which is the behaviour you want from a tab bar.
    p_status:
      args.statusFilter.kind === "value" ? args.statusFilter.value : undefined,
    p_search: args.search ?? undefined,
  });

  const facets = (data ?? {}) as Partial<SystemLogFacets>;
  return {
    statuses: facets.statuses ?? [],
    actions: facets.actions ?? [],
    total: facets.total ?? 0,
  };
}

/**
 * Free-text search runs over the four columns worth scanning. Commas and
 * parentheses are stripped because PostgREST's `or=` filter uses them as its
 * own syntax, and an unescaped one would be parsed as part of the filter rather
 * than as part of the term.
 */
function buildSearchFilter(search: string): string {
  const term = search.replace(/[,()*\\]/g, " ").trim();
  if (!term) return "";
  return [
    `action.ilike.%${term}%`,
    `user_email.ilike.%${term}%`,
    `path.ilike.%${term}%`,
    `error_message.ilike.%${term}%`,
  ].join(",");
}

async function loadLogs(
  supabase: Client,
  args: {
    office: string | null;
    user: string | null;
    action: string | null;
    statusFilter: StatusFilter;
    search: string | null;
    page: number;
  }
): Promise<{ rows: SystemLogRow[]; total: number; error: string | null }> {
  const from = (args.page - 1) * PAGE_SIZE;

  let query = supabase
    .from("system_logs")
    .select("*", { count: "exact" })
    .order("occurred_at", { ascending: false })
    // Stable tiebreaker so rows sharing a timestamp keep a fixed order and
    // never shuffle between pages.
    .order("id", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (args.office) query = query.eq("doctor_office_id", args.office);
  if (args.user) query = query.eq("user_id", args.user);
  if (args.action) query = query.eq("action", args.action);
  if (args.statusFilter.kind === "value") {
    query = query.eq("status", args.statusFilter.value);
  } else if (args.statusFilter.kind === "null") {
    query = query.is("status", null);
  }
  if (args.search) {
    const filter = buildSearchFilter(args.search);
    if (filter) query = query.or(filter);
  }

  const { data, error, count } = await query;
  if (error) {
    return { rows: [], total: 0, error: error.message };
  }

  return { rows: (data ?? []) as SystemLogRow[], total: count ?? 0, error: null };
}
