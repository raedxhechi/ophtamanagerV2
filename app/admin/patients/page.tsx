import { Suspense } from "react";

import {
  AdminPatientsData,
  type AdminPatientsFilters,
} from "./_components/AdminPatientsData";
import {
  AdminPatientsFallback,
  AdminPatientsPageShell,
} from "./_components/AdminPatientsPageShell";

export const metadata = { title: "Patients" };

export default async function AdminPatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ office?: string; q?: string; page?: string }>;
}) {
  // Only the search params are read here — no database work — so the shell
  // renders and streams straight away and the queries below it are what suspend.
  const params = await searchParams;
  const filters: AdminPatientsFilters = {
    office: params.office ?? "",
    search: (params.q ?? "").trim(),
    page: Math.max(1, Number(params.page) || 1),
  };

  return (
    <AdminPatientsPageShell>
      {/*
        Deliberately unkeyed. Keying this on the filters would remount the
        boundary on every click and drop the whole table back to the skeleton;
        left alone, React keeps the rows on screen through the transition and
        the table dims them while the next set loads.
      */}
      <Suspense fallback={<AdminPatientsFallback />}>
        <AdminPatientsData filters={filters} />
      </Suspense>
    </AdminPatientsPageShell>
  );
}
