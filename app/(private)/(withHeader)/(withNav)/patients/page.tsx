import { createClient } from "@/supabase/server";

import { PatientsTable, type PatientRow } from "./_components/PatientsTable";
import type { SubOrderForPatient } from "./_components/SubOrdersTable/SubOrdersTable";

const PAGE_SIZE = 100;

// Patients and their suborders are fetched together, one page (100 rows) at a
// time. The suborders each visible patient needs are embedded in the same query
// so there's no follow-up client fetch, and the page range is derived from the
// total patient count.
const PATIENTS_SELECT = `
  *,
  insurance_company:insurance_company_id(name),
  suborders (
    id,
    left_eye,
    right_eye,
    order:orders ( created_at, application_date, delivery_date, medicine ( name ) )
  )
`;

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const supabase = await createClient();

  const { page: pageParam, q: qParam } = await searchParams;
  const requestedPage = Math.max(1, Number(pageParam) || 1);
  const search = (qParam ?? "").trim();
  const from = (requestedPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // RLS scopes this to the current user's office automatically. `count: exact`
  // returns the office's (filtered) patient count so the page count can be
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

  for (const token of search.split(/\s+/).filter(Boolean)) {
    query = query.ilike("search_text", `%${token}%`);
  }

  const { data, error, count } = await query;

  const totalCount = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const patients: PatientRow[] = ((data ?? []) as any[]).map((patient) => ({
    ...patient,
    suborders: ((patient.suborders ?? []) as any[]).map(
      (suborder): SubOrderForPatient => ({
        id: suborder.id,
        left_eye: suborder.left_eye,
        right_eye: suborder.right_eye,
        first_name: patient.first_name ?? "",
        last_name: patient.last_name ?? "",
        date_of_birth: patient.date_of_birth ?? null,
        order: {
          created_at: suborder.order?.created_at ?? null,
          application_date: suborder.order?.application_date ?? null,
          delivery_date: suborder.order?.delivery_date ?? null,
          medicine: suborder.order?.medicine
            ? { name: suborder.order.medicine.name }
            : null,
        },
      })
    ),
  }));

  return (
    <div className="mx-auto w-full max-w-[96rem] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Failed to load patients: {error.message}
        </p>
      ) : (
        <PatientsTable
          data={patients}
          page={requestedPage}
          pageCount={pageCount}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          search={search}
        />
      )}
    </div>
  );
}
