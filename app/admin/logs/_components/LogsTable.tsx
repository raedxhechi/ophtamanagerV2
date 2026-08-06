"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SystemLogRow } from "@/types/systemLogs";

import { LogDetailsDrawer } from "./LogDetailsDrawer";
import { useAdminFilters } from "../../_components/useAdminFilters";

/** `dd.mm.yyyy, HH:MM:SS` — logs need the seconds to be read in order. */
export function formatLogTime(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const date = parsed.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = parsed.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${date}, ${time}`;
}

/**
 * Colour the status by class, not by exact code, so a status nobody has seen
 * before still lands in the right bucket.
 */
export function statusClassName(status: number | null): string {
  if (status === null) return "bg-muted text-muted-foreground";
  if (status < 300) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status < 400) return "bg-sky-100 text-sky-800 border-sky-200";
  if (status === 401 || status === 403) {
    return "bg-orange-100 text-orange-800 border-orange-200";
  }
  if (status < 500) return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

export function LogsTable({
  logs,
  page,
  pageCount,
  pageSize,
  totalCount,
}: {
  logs: SystemLogRow[];
  page: number;
  pageCount: number;
  pageSize: number;
  totalCount: number;
}) {
  const { setFilters } = useAdminFilters();
  const [selected, setSelected] = React.useState<SystemLogRow | null>(null);

  const goToPage = React.useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(1, next), pageCount);
      setFilters({ page: clamped > 1 ? String(clamped) : null }, { keepPage: true });
    },
    [pageCount, setFilters]
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-44">Time</TableHead>
              <TableHead className="w-56">User</TableHead>
              <TableHead className="w-44">Action</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-20">Duration</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length ? (
              logs.map((log) => (
                <TableRow
                  key={log.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(log)}
                >
                  <TableCell className="text-muted-foreground whitespace-nowrap tabular-nums">
                    {formatLogTime(log.occurred_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="truncate">{log.user_email ?? "—"}</span>
                      {!log.actor_verified && (
                        <span
                          className="text-muted-foreground text-xs"
                          title="Identity taken from the request, not confirmed against a live session — typical when the session had already expired."
                        >
                          claimed
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.action}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("tabular-nums", statusClassName(log.status))}
                    >
                      {log.status ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {log.duration_ms === null ? "—" : `${log.duration_ms} ms`}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-md truncate text-sm">
                    {log.error_message ?? (log.ok ? "" : (log.error_code ?? ""))}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground h-24 text-center"
                >
                  No log entries match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground hidden text-sm lg:block">
          {totalCount} entr{totalCount === 1 ? "y" : "ies"}
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="text-muted-foreground hidden items-center gap-2 text-sm lg:flex">
            {pageSize} per page
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Page {page} of {pageCount}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => goToPage(1)}
              disabled={page <= 1}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => goToPage(page + 1)}
              disabled={page >= pageCount}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => goToPage(pageCount)}
              disabled={page >= pageCount}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>

      <LogDetailsDrawer
        log={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
