import { createClient } from "@/supabase/server";
import type { InvoiceType, Order } from "@/types";

import type { OfficeOption } from "../../_components/OfficeFilter";
import { AdminOrdersTable } from "./AdminOrdersTable";

const PAGE_SIZE = 100;

export type AdminOrdersFilters = {
  /** Doctor office id, or "" for every office. */
  office: string;
  /** The active server-side search, mirrored from the `q` search param. */
  search: string;
  /** 1-based page index, already clamped by the page. */
  page: number;
};

/** A suborder as shown (and edited) in the order drawer. */
export type AdminOrderSubOrder = {
  id: string;
  left_eye: boolean;
  right_eye: boolean;
  invoice_type: InvoiceType | null;
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    insurance_companies: { name: string } | null;
  } | null;
};

export type AdminOrderRow = Order & {
  medicine: { id: string; name: string } | null;
  doctor_office: { id: string; name: string | null } | null;
  created_by_user: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  suborders: AdminOrderSubOrder[];
};

// The office is part of every row here (the admin list spans all of them), and
// each order's suborders come along in the same query so opening the drawer
// doesn't cost a follow-up fetch. `created_by` stays the raw column; the user
// row is aliased separately so both are available.
const ORDERS_SELECT = `
  *,
  medicine:medicine_id(id, name),
  doctor_office:doctor_office_id(id, name),
  created_by_user:created_by(id, email, first_name, last_name),
  suborders (
    id,
    left_eye,
    right_eye,
    invoice_type,
    patient:patients ( id, first_name, last_name, date_of_birth, insurance_companies ( name ) )
  )
`;

/**
 * The suspending half of the admin orders page: the admin check and both
 * queries live here so the shell around it renders immediately.
 */
export async function AdminOrdersData({
  filters,
}: {
  filters: AdminOrdersFilters;
}) {
  const supabase = await createClient();

  // RLS already limits the queries below to admins — a non-admin sees only
  // their own office, which would silently look like a very small database.
  // Checking explicitly turns that into a clear answer.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return (
      <p className="text-muted-foreground text-sm">
        You need an admin account to view all orders.
      </p>
    );
  }

  const from = (filters.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // `count: exact` returns the filtered order count so the page count can be
  // derived. Search is server-side: each whitespace-separated token must appear
  // in the order's `search_text` (ANDed). That text bundles the medicine, the
  // dates and every suborder's patient, so a patient name matches their orders.
  let query = supabase
    .from("orders")
    .select(ORDERS_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    // Stable tiebreaker so orders with an identical created_at keep a fixed
    // order and never shuffle between pages.
    .order("id", { ascending: false })
    .range(from, to);

  if (filters.office) query = query.eq("doctor_office_id", filters.office);

  for (const token of filters.search.split(/\s+/).filter(Boolean)) {
    query = query.ilike("search_text", `%${token}%`);
  }

  const [officesResult, ordersResult] = await Promise.all([
    supabase.from("doctor_office").select("id, name").order("name"),
    query,
  ]);

  const offices = (officesResult.data ?? []) as OfficeOption[];

  if (ordersResult.error) {
    return (
      <p className="text-destructive text-sm">
        Failed to load orders: {ordersResult.error.message}
      </p>
    );
  }

  const totalCount = ordersResult.count ?? 0;

  return (
    <AdminOrdersTable
      data={(ordersResult.data ?? []) as unknown as AdminOrderRow[]}
      offices={offices}
      filters={filters}
      pageCount={Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
      totalCount={totalCount}
      pageSize={PAGE_SIZE}
    />
  );
}
