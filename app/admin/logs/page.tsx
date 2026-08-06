import { Suspense } from "react";

import { LogsData, type LogsFilters } from "./_components/LogsData";
import { LogsFallback, LogsPageShell } from "./_components/LogsPageShell";

export const metadata = { title: "System logs" };

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    office?: string;
    user?: string;
    action?: string;
    status?: string;
    q?: string;
    page?: string;
  }>;
}) {
  // Only the search params are read here — no database work — so the shell
  // renders and streams straight away and the queries below it are what suspend.
  const params = await searchParams;
  const filters: LogsFilters = {
    office: params.office ?? "",
    user: params.user ?? "",
    action: params.action ?? "",
    status: params.status ?? "",
    search: (params.q ?? "").trim(),
    page: Math.max(1, Number(params.page) || 1),
  };

  return (
    <LogsPageShell>
      {/*
        Deliberately unkeyed. Keying this on the filters would remount the
        boundary on every click and drop the whole page back to the skeleton —
        including the users panel, which usually hasn't changed. Left alone,
        React keeps the rendered log on screen through the transition and swaps
        it when the new rows arrive; LogsBrowser marks it as loading meanwhile.
        The skeleton is then what it should be: the first paint, nothing else.
      */}
      <Suspense fallback={<LogsFallback />}>
        <LogsData filters={filters} />
      </Suspense>
    </LogsPageShell>
  );
}
