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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { ImportResult, SyncCounts } from "../types";

interface SyncPanelProps {
  /** Plural entity name, e.g. "patients" or "doctor offices". */
  entityLabel: string;
  initialCounts: SyncCounts | null;
  initialError: string | null;
  getCounts: () => Promise<SyncCounts>;
  runImport: () => Promise<ImportResult>;
}

function CountCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | null;
  loading: boolean;
}) {
  return (
    <Card className="flex-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">
          {loading ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          ) : (
            (value ?? "—")
          )}
        </div>
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
}: SyncPanelProps) {
  const [counts, setCounts] = React.useState<SyncCounts | null>(initialCounts);
  const [countsError, setCountsError] = React.useState<string | null>(
    initialError
  );
  const [refreshing, setRefreshing] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);

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

  const doImport = React.useCallback(async () => {
    setConfirming(false);
    setImporting(true);
    setResult(null);
    try {
      const res = await runImport();
      setResult(res);
      await refreshCounts();
    } catch (e) {
      setResult({
        total: 0,
        imported: 0,
        failed: 1,
        errors: [
          {
            directusId: "-",
            message: e instanceof Error ? e.message : "Import failed.",
          },
        ],
      });
    } finally {
      setImporting(false);
    }
  }, [runImport, refreshCounts]);

  return (
    <div className="flex flex-col gap-6">
      {/* Counts */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <CountCard
            label="In Directus"
            value={counts?.directus ?? null}
            loading={refreshing}
          />
          <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
          <CountCard
            label="In Supabase"
            value={counts?.supabase ?? null}
            loading={refreshing}
          />
        </div>
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshCounts}
            disabled={refreshing || importing}
          >
            <RefreshCw
              className={refreshing ? "size-4 animate-spin" : "size-4"}
            />
            Refresh counts
          </Button>
        </div>
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
