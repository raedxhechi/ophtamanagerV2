import { Suspense } from "react";

import { PatientsData } from "./_components/PatientsData";
import {
  PatientsPageShell,
  PatientsTableFallback,
} from "./_components/PatientsPageShell";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  // Only the search params are read here — no database work — so the shell
  // renders and streams straight away and the query below it is what suspends.
  const { page: pageParam, q: qParam } = await searchParams;
  const requestedPage = Math.max(1, Number(pageParam) || 1);
  const search = (qParam ?? "").trim();

  return (
    <PatientsPageShell>
      {/*
        Keyed on the page number so paginating mounts a fresh boundary and
        shows the skeleton immediately, rather than holding the old rows on
        screen for as long as the query takes. Deliberately not keyed on the
        search: search-as-you-type keeps the loaded rows (dimmed by the table
        while the request is in flight) so the input never loses focus.
      */}
      <Suspense key={requestedPage} fallback={<PatientsTableFallback />}>
        <PatientsData page={requestedPage} search={search} />
      </Suspense>
    </PatientsPageShell>
  );
}
