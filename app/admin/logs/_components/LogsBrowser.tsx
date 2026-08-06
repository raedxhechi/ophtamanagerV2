"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SystemLogFacets, SystemLogRow } from "@/types/systemLogs";

import type { LogsFilters } from "./LogsData";
import { LogsTable } from "./LogsTable";
import { UsersPanel } from "./UsersPanel";
import type { LogUser, OfficeOption } from "./types";
import { useAdminFilters } from "../../_components/useAdminFilters";

/** Sentinels for the "no filter" options — Radix rejects an empty value. */
const ALL_ACTIONS = "__all__";
const ALL_STATUSES = "all";
/** Tab for calls that never reached the server, which have no status at all. */
const NO_STATUS = "none";

export function LogsBrowser({
  filters,
  offices,
  users,
  facets,
  logs,
  totalCount,
  pageCount,
  pageSize,
  error,
}: {
  filters: LogsFilters;
  offices: OfficeOption[];
  users: LogUser[];
  facets: SystemLogFacets;
  logs: SystemLogRow[];
  totalCount: number;
  pageCount: number;
  pageSize: number;
  error: string | null;
}) {
  const { setFilters, isPending } = useAdminFilters();

  // Tabs come from the data rather than a fixed list, so a status the app
  // starts returning tomorrow gets a tab without a code change. Ascending, with
  // the no-response tab last.
  const statusTabs = React.useMemo(() => {
    const withStatus = facets.statuses
      .filter((facet) => facet.status !== null)
      .sort((a, b) => (a.status ?? 0) - (b.status ?? 0));
    const withoutStatus = facets.statuses.find((facet) => facet.status === null);
    return { withStatus, withoutStatus };
  }, [facets.statuses]);

  const allCount = React.useMemo(
    () => facets.statuses.reduce((total, facet) => total + facet.count, 0),
    [facets.statuses]
  );

  // The search box is controlled and seeded from the URL; typing is debounced
  // before it is committed so a round-trip doesn't fire on every keystroke.
  const [searchInput, setSearchInput] = React.useState(filters.search);
  React.useEffect(() => setSearchInput(filters.search), [filters.search]);
  React.useEffect(() => {
    const next = searchInput.trim();
    if (next === filters.search) return;
    const timeout = setTimeout(
      () => setFilters({ q: next || null }, { replace: true }),
      300
    );
    return () => clearTimeout(timeout);
  }, [searchInput, filters.search, setFilters]);

  const activeStatusTab = filters.status || ALL_STATUSES;

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row">
      <UsersPanel
        users={users}
        offices={offices}
        selectedOffice={filters.office}
        selectedUser={filters.user}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Tabs
          value={activeStatusTab}
          onValueChange={(value) =>
            setFilters({ status: value === ALL_STATUSES ? null : value })
          }
        >
          <TabsList className="flex-wrap">
            <TabsTrigger value={ALL_STATUSES}>
              All <TabCount count={allCount} />
            </TabsTrigger>
            {statusTabs.withStatus.map((facet) => (
              <TabsTrigger key={facet.status} value={String(facet.status)}>
                {facet.status} <TabCount count={facet.count} />
              </TabsTrigger>
            ))}
            {statusTabs.withoutStatus && (
              <TabsTrigger value={NO_STATUS} title="Never reached the server">
                No response <TabCount count={statusTabs.withoutStatus.count} />
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filters.action || ALL_ACTIONS}
            onValueChange={(value) =>
              setFilters({ action: value === ALL_ACTIONS ? null : value })
            }
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value={ALL_ACTIONS}>All actions</SelectItem>
              {facets.actions.map((facet) => (
                <SelectItem key={facet.action} value={facet.action}>
                  {facet.action} ({facet.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Search email, path or error…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="h-9 w-full max-w-xs"
          />

          {(filters.office ||
            filters.user ||
            filters.action ||
            filters.status ||
            filters.search) && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
              onClick={() =>
                setFilters({
                  office: null,
                  user: null,
                  action: null,
                  status: null,
                  q: null,
                })
              }
            >
              Clear filters
            </button>
          )}
        </div>

        {error ? (
          <p className="text-destructive text-sm">Failed to load logs: {error}</p>
        ) : (
          <div className="relative flex flex-col gap-2">
            {/*
              A thin bar rather than dimming the rows: the log you were reading
              stays readable while the next set loads, which is the whole point
              of not remounting the boundary. The filters above stay live too —
              changing your mind mid-load shouldn't need you to wait first.
            */}
            <div
              className={cn(
                "bg-primary/70 h-0.5 w-full rounded-full transition-opacity duration-150",
                isPending ? "animate-pulse opacity-100" : "opacity-0"
              )}
              aria-hidden
            />
            <div aria-busy={isPending}>
              <LogsTable
                logs={logs}
                page={filters.page}
                pageCount={pageCount}
                pageSize={pageSize}
                totalCount={totalCount}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabCount({ count }: { count: number }) {
  return (
    <span className="text-muted-foreground ml-1 text-xs tabular-nums">
      {count}
    </span>
  );
}
