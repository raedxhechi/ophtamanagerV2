"use client";

import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  StopCircle,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { SyncTerminal, type LogLine } from "./SyncTerminal";

import type { ImportResult, SyncCounts, SyncEvent } from "../types";

/** Result of a destructive "clear all" action. */
export type ClearResult = { ok: boolean; message: string };

interface SyncPanelProps {
  /** Plural entity name, e.g. "patients" or "doctor offices". */
  entityLabel: string;
  initialCounts: SyncCounts | null;
  initialError: string | null;
  getCounts: () => Promise<SyncCounts>;
  /** Non-streaming import. Used when `streamPath` isn't set. */
  runImport?: () => Promise<ImportResult>;
  /**
   * URL of a POST route that streams NDJSON {@link SyncEvent}s. When set, the
   * panel shows a live terminal log + running count instead of a plain spinner.
   */
  streamPath?: string;
  /**
   * When set, a destructive "Clear all" button (with confirm) appears under the
   * Supabase count, wiping every synced row on the Supabase side.
   */
  onClearAll?: () => Promise<ClearResult>;
}

type Progress = { imported: number; failed: number; total: number };

function CountCard({
  label,
  value,
  loading,
  secondary,
  action,
}: {
  label: string;
  value: number | null;
  loading: boolean;
  secondary?: { label: string; value: number };
  action?: React.ReactNode;
}) {
  return (
    <Card className="flex-1">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">
          {loading ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          ) : (
            (value ?? "—")
          )}
        </div>
        {secondary ? (
          <div
            className={cn(
              "mt-1 text-sm tabular-nums text-muted-foreground",
              loading && "opacity-50"
            )}
          >
            {secondary.value.toLocaleString()} {secondary.label}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SyncPanel({
  entityLabel,
  initialCounts,
  initialError,
  getCounts,
  runImport,
  streamPath,
  onClearAll,
}: SyncPanelProps) {
  const [counts, setCounts] = React.useState<SyncCounts | null>(initialCounts);
  const [countsError, setCountsError] = React.useState<string | null>(
    initialError
  );
  const [refreshing, setRefreshing] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [logs, setLogs] = React.useState<LogLine[]>([]);
  const [progress, setProgress] = React.useState<Progress | null>(null);

  // Clear-all state.
  const [clearConfirming, setClearConfirming] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const [clearResult, setClearResult] = React.useState<ClearResult | null>(null);

  // Lets the Stop button abort the in-flight streaming import.
  const abortRef = React.useRef<AbortController | null>(null);

  const refreshCounts = React.useCallback(async () => {
    setRefreshing(true);
    setCountsError(null);
    try {
      setCounts(await getCounts());
    } catch (e) {
      setCountsError(e instanceof Error ? e.message : "Failed to load counts.");
    } finally {
      setRefreshing(false);
    }
  }, [getCounts]);

  // Streaming import: read the NDJSON body line by line, feeding the terminal
  // log and running count as events arrive. Aborts when `signal` fires (Stop).
  const streamImport = React.useCallback(
    async (signal: AbortSignal) => {
    const res = await fetch(streamPath!, { method: "POST", signal });
    if (!res.ok || !res.body) {
      throw new Error(`Import request failed (${res.status}).`);
    }

    const handleEvent = (event: SyncEvent) => {
      if (event.type === "log") {
        setLogs((prev) => [...prev, { level: event.level, message: event.message }]);
      } else if (event.type === "progress") {
        setProgress({
          imported: event.imported,
          failed: event.failed,
          total: event.total,
        });
      } else if (event.type === "result") {
        setResult(event.result);
      }
    };

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) handleEvent(JSON.parse(line) as SyncEvent);
      }
    }
    if (buffer.trim()) handleEvent(JSON.parse(buffer) as SyncEvent);
    },
    [streamPath]
  );

  const doImport = React.useCallback(async () => {
    setConfirming(false);
    setImporting(true);
    setResult(null);
    setLogs([]);
    setProgress(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      if (streamPath) {
        await streamImport(controller.signal);
      } else if (runImport) {
        setResult(await runImport());
      }
      await refreshCounts();
    } catch (e) {
      // A user-triggered Stop aborts the fetch — report it, don't treat it as a
      // failure.
      if (controller.signal.aborted) {
        setLogs((prev) => [
          ...prev,
          { level: "warn", message: "Import stopped by user." },
        ]);
        await refreshCounts();
      } else {
        const message = e instanceof Error ? e.message : "Import failed.";
        setLogs((prev) => [...prev, { level: "error", message }]);
        setResult({
          total: 0,
          imported: 0,
          failed: 1,
          errors: [{ directusId: "-", message }],
        });
      }
    } finally {
      abortRef.current = null;
      setImporting(false);
    }
  }, [streamPath, streamImport, runImport, refreshCounts]);

  const stopImport = React.useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const doClearAll = React.useCallback(async () => {
    if (!onClearAll) return;
    setClearConfirming(false);
    setClearing(true);
    setClearResult(null);
    try {
      const res = await onClearAll();
      setClearResult(res);
      await refreshCounts();
    } catch (e) {
      setClearResult({
        ok: false,
        message: e instanceof Error ? e.message : "Clear failed.",
      });
    } finally {
      setClearing(false);
    }
  }, [onClearAll, refreshCounts]);

  // Destructive "clear all" control, rendered inside the Supabase count card.
  const clearAllControls = onClearAll ? (
    clearConfirming ? (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-destructive">
          Delete all Supabase {entityLabel}?
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={doClearAll}
            disabled={clearing}
          >
            {clearing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Yes, delete all"
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setClearConfirming(false)}
            disabled={clearing}
          >
            Cancel
          </Button>
        </div>
      </div>
    ) : (
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => {
          setClearResult(null);
          setClearConfirming(true);
        }}
        disabled={importing || clearing || counts === null}
      >
        <Trash2 className="size-4" />
        Clear all
      </Button>
    )
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Counts */}
      <div className="flex flex-col gap-3">
        <div className="flex items-stretch gap-3">
          <CountCard
            label="In Directus"
            value={counts?.directus ?? null}
            loading={refreshing}
            secondary={
              counts?.secondary
                ? {
                    label: counts.secondary.label,
                    value: counts.secondary.directus,
                  }
                : undefined
            }
          />
          <ArrowRight className="size-5 shrink-0 self-center text-muted-foreground" />
          <CountCard
            label="In Supabase"
            value={counts?.supabase ?? null}
            loading={refreshing}
            secondary={
              counts?.secondary
                ? {
                    label: counts.secondary.label,
                    value: counts.secondary.supabase,
                  }
                : undefined
            }
            action={clearAllControls}
          />
        </div>
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshCounts}
            disabled={refreshing || importing || clearing}
          >
            <RefreshCw
              className={refreshing ? "size-4 animate-spin" : "size-4"}
            />
            Refresh counts
          </Button>
        </div>
        {clearResult ? (
          <p
            className={cn(
              "flex items-center gap-2 text-sm",
              clearResult.ok
                ? "text-green-600 dark:text-green-500"
                : "text-destructive"
            )}
          >
            {clearResult.ok ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <AlertCircle className="size-4" />
            )}
            {clearResult.message}
          </p>
        ) : null}
        {countsError ? (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            {countsError}
          </p>
        ) : null}
      </div>

      {/* Import action + confirmation */}
      <div className="rounded-lg border p-4">
        {!confirming ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="size-4" />
              Copy all {entityLabel} from Directus into Supabase. Existing rows
              are updated, not duplicated.
            </div>
            <Button
              onClick={() => setConfirming(true)}
              disabled={importing || counts === null}
            >
              Import {entityLabel}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">
              Import {counts?.directus ?? "all"} {entityLabel} from Directus into
              Supabase?
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={doImport} disabled={importing}>
                {importing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  "Confirm import"
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={importing}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Live progress: running count + terminal log (streaming imports only) */}
      {streamPath && (importing || logs.length > 0) ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {importing ? (
              <span className="flex items-center gap-2 font-medium">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                Importing…
              </span>
            ) : null}
            <span className="tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">
                {progress?.imported ?? 0}
              </span>
              {progress ? ` / ${progress.total}` : null} imported
            </span>
            {progress && progress.failed > 0 ? (
              <span className="font-medium text-destructive tabular-nums">
                {progress.failed} failed
              </span>
            ) : null}
            {importing ? (
              <Button
                variant="destructive"
                size="sm"
                className="ml-auto"
                onClick={stopImport}
              >
                <StopCircle className="size-4" />
                Stop
              </Button>
            ) : null}
          </div>
          <SyncTerminal title={`import ${entityLabel}`} logs={logs} />
        </div>
      ) : null}

      {/* Result */}
      {result ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-2 font-medium text-green-600 dark:text-green-500">
              <CheckCircle2 className="size-4" />
              {result.imported} imported
            </span>
            {result.failed > 0 ? (
              <span className="flex items-center gap-2 font-medium text-destructive">
                <AlertCircle className="size-4" />
                {result.failed} failed
              </span>
            ) : null}
            {(result.warnings?.length ?? 0) > 0 ? (
              <span className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-500">
                <AlertTriangle className="size-4" />
                {result.warnings!.length} warnings
              </span>
            ) : null}
            <span className="text-muted-foreground">
              {result.total} total in Directus
            </span>
          </div>

          {(result.warnings?.length ?? 0) > 0 ? (
            <p className="text-sm font-medium text-amber-600 dark:text-amber-500">
              Sync completed, but some connections could not be resolved — the
              referenced rows aren&apos;t in Supabase yet. Import those first,
              then re-run this to complete the links.
            </p>
          ) : null}

          {result.errors.length > 0 ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Errors
              </p>
              <div className="max-h-72 overflow-auto rounded-lg border border-destructive/40">
                <ul className="divide-y divide-border text-sm">
                  {result.errors.map((err, idx) => (
                    <li
                      key={`${err.directusId}-${idx}`}
                      className="flex gap-3 px-3 py-2"
                    >
                      <span className="max-w-[10rem] shrink-0 truncate font-mono text-muted-foreground">
                        #{err.directusId}
                      </span>
                      <span className="text-destructive">{err.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {(result.warnings?.length ?? 0) > 0 ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Warnings
              </p>
              <div className="max-h-72 overflow-auto rounded-lg border border-amber-500/40">
                <ul className="divide-y divide-border text-sm">
                  {result.warnings!.map((warn, idx) => (
                    <li
                      key={`${warn.directusId}-${idx}`}
                      className="flex gap-3 px-3 py-2"
                    >
                      <span className="max-w-[10rem] shrink-0 truncate font-mono text-muted-foreground">
                        #{warn.directusId}
                      </span>
                      <span className="text-amber-600 dark:text-amber-500">
                        {warn.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {result.errors.length === 0 &&
          (result.warnings?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No issues — all {entityLabel} imported and connected successfully.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
