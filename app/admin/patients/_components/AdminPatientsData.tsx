import { createClient } from "@/supabase/server";
import type { InvoiceType, Patient } from "@/types";

import type { OfficeOption } from "../../_components/OfficeFilter";
import { AdminPatientsTable } from "./AdminPatientsTable";

const PAGE_SIZE = 100;

export type AdminPatientsFilters = {
  /** Doctor office id, or "" for every office. */
  office: string;
  /** The active server-side search, mirrored from the `q` search param. */
  search: string;
  /** 1-based page index, already clamped by the page. */
  page: number;
};

/** A suborder as shown in the patient drawer: its order's medicine and dates. */
export type AdminPatientSubOrder = {
  id: string;
  left_eye: boolean;
  right_eye: boolean;
  invoice_type: InvoiceType | null;
  order: {
    id: string;
    created_at: string | null;
    application_date: string | null;
    delivery_date: string | null;
    medicine: { name: string } | null;
  } | null;
};

export type AdminPatientRow = Patient & {
  insurance_company: { name: string } | null;
  doctor_office: { id: string; name: string | null } | null;
  suborders: AdminPatientSubOrder[];
};

// The office is part of every row here (the admin list spans all of them), and
// each patient's suborders come along in the same query so opening the drawer
// doesn't cost a follow-up fetch.
const PATIENTS_SELECT = `
  *,
  insurance_company:insurance_company_id(name),
  doctor_office:doctor_office_id(id, name),
  suborders (
    id,
    left_eye,
    right_eye,
    invoice_type,
    order:orders ( id, created_at, application_date, delivery_date, medicine ( name ) )
  )
`;

/**
 * The suspending half of the admin patients page: the admin check and both
 * queries live here so the shell around it renders immediately.
 */
export async function AdminPatientsData({
  filters,
}: {
  filters: AdminPatientsFilters;
}) {
  const supabase = await createClient();

  // RLS already limits the queries below to admins — a non-admin sees only
  // their own office, which would silently look like a very small database.
  // Checking explicitly turns that into a clear answer.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return (
      <p className="text-muted-foreground text-sm">
        You need an admin account to view all patients.
      </p>
    );
  }

  const from = (filters.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // `count: exact` returns the filtered patient count so the page count can be
  // derived. Search is server-side: each whitespace-separated token must appear
  // in the patient's `search_text` (ANDed), so results span all pages, not just
  // the loaded one.
  let query = supabase
    .from("patients")
    .select(PATIENTS_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    // Stable tiebreaker so patients with an identical created_at keep a fixed
    // order and never shuffle between pages.
    .order("id", { ascending: false })
    .range(from, to);

  if (filters.office) query = query.eq("doctor_office_id", filters.office);

  for (const token of filters.search.split(/\s+/).filter(Boolean)) {
    query = query.ilike("search_text", `%${token}%`);
  }

  const [officesResult, patientsResult] = await Promise.all([
    supabase.from("doctor_office").select("id, name").order("name"),
    query,
  ]);

  const offices = (officesResult.data ?? []) as OfficeOption[];

  if (patientsResult.error) {
    return (
      <p className="text-destructive text-sm">
        Failed to load patients: {patientsResult.error.message}
      </p>
    );
  }

  const totalCount = patientsResult.count ?? 0;

  return (
    <AdminPatientsTable
      data={(patientsResult.data ?? []) as unknown as AdminPatientRow[]}
      offices={offices}
      filters={filters}
      pageCount={Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
      totalCount={totalCount}
      pageSize={PAGE_SIZE}
    />
  );
}
