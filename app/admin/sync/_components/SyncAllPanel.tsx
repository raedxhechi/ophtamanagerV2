"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  PlayCircle,
  StopCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { SYNC_STEPS } from "../all/steps";
import type { ImportResult, SyncCounts, SyncEvent } from "../types";
import type { SyncOverview } from "../actions";
import { SyncTerminal, type LogLine } from "./SyncTerminal";

function OverviewCard({
  title,
  counts,
  step,
}: {
  title: string;
  counts: SyncCounts;
  step: number;
}) {
  const remaining = Math.max(counts.directus - counts.supabase, 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="bg-muted text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
            {step}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Directus</span>
            <span className="text-3xl font-semibold tabular-nums">
              {counts.directus}
            </span>
          </div>
          <ArrowRight className="text-muted-foreground size-5 shrink-0" />
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Supabase</span>
            <span className="text-3xl font-semibold tabular-nums">
              {counts.supabase}
            </span>
          </div>
        </div>
        <p className="text-muted-foreground mt-3 text-xs">
          {remaining > 0
            ? `${remaining} not yet in Supabase`
            : "Supabase is up to date"}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * The sync overview: what is where, and one button that copies all of it.
 *
 * The cards and the log are the same space rather than two stacked panels. A
 * running sync is the only thing worth looking at while it runs — the counts
 * behind it are stale the moment it starts and would just be six numbers
 * quietly lying — so they are put away until it finishes, and the run can be
 * dismissed to get them back, freshly read.
 */
export function SyncAllPanel({
  overview,
}: {
  overview: SyncOverview;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [logs, setLogs] = React.useState<LogLine[]>([]);
  const [progress, setProgress] = React.useState<{
    imported: number;
    failed: number;
    total: number;
  } | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);

  const abortRef = React.useRef<AbortController | null>(null);

  const runAll = React.useCallback(async () => {
    setConfirming(false);
    setRunning(true);
    setLogs([]);
    setProgress(null);
    setResult(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const append = (level: LogLine["level"], message: string) =>
      setLogs((prev) => [...prev, { level, message }]);

    // Totals across the whole run, accumulated from each step's own result so
    // the counter keeps climbing instead of restarting at every step.
    const totals: ImportResult = {
      total: 0,
      imported: 0,
      failed: 0,
      errors: [],
      warnings: [],
    };
    const started = Date.now();

    append("info", "Starting full sync — Directus → Supabase");
    append("info", "");

    try {
      for (const [index, step] of SYNC_STEPS.entries()) {
        if (controller.signal.aborted) break;

        append("info", `[${index + 1}/${SYNC_STEPS.length}] ${step.label}…`);

        // A request per step, so each gets its own timeout rather than six
        // entities sharing one. This is the loop a person used to run by hand.
        try {
          const res = await fetch(`/admin/sync/all/stream/${step.slug}`, {
            method: "POST",
            signal: controller.signal,
          });
          if (!res.ok || !res.body) {
            throw new Error(`Request failed (${res.status}).`);
          }

          // Each step reports its own totals; they are folded in when its
          // `result` arrives, and the live counter shows the run so far plus
          // whatever the current step has managed.
          let stepProgress = { imported: 0, failed: 0, total: 0 };

          const handleEvent = (event: SyncEvent) => {
            if (event.type === "log") {
              append(event.level, event.message);
            } else if (event.type === "progress") {
              stepProgress = {
                imported: event.imported,
                failed: event.failed,
                total: event.total,
              };
              setProgress({
                imported: totals.imported + event.imported,
                failed: totals.failed + event.failed,
                total: totals.total + event.total,
              });
            } else if (event.type === "result") {
              totals.imported += event.result.imported;
              totals.failed += event.result.failed;
              totals.total += event.result.total;
              totals.errors.push(...event.result.errors);
              totals.warnings!.push(...(event.result.warnings ?? []));
              stepProgress = { imported: 0, failed: 0, total: 0 };
              setProgress({
                imported: totals.imported,
                failed: totals.failed,
                total: totals.total,
              });
            }
          };

          // NDJSON: split on newlines, keeping the trailing partial line in the
          // buffer until the next chunk completes it.
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

          // A step that streamed progress but never a result (a timeout cutting
          // the body short) would otherwise vanish from the totals.
          if (stepProgress.total > 0) {
            totals.imported += stepProgress.imported;
            totals.failed += stepProgress.failed;
            totals.total += stepProgress.total;
          }
        } catch (e) {
          if (controller.signal.aborted) throw e;
          // One step failing is not the run failing: the steps are independent
          // copies, and the ones after it are usually still worth doing — a
          // medicine that could not be copied costs a few order links, not the
          // patients. Say so and carry on.
          const message = e instanceof Error ? e.message : "Step failed.";
          totals.failed += 1;
          totals.errors.push({ directusId: step.label, message });
          append("error", `${step.label}: ${message}`);
        }

        append("info", "");
      }

      if (controller.signal.aborted) {
        append("warn", "Sync stopped by user.");
      } else {
        const seconds = ((Date.now() - started) / 1000).toFixed(1);
        append(
          totals.failed > 0 ? "warn" : "success",
          `Full sync finished in ${seconds}s — ${totals.imported} rows imported, ${totals.failed} failed, ${totals.warnings!.length} warnings.`
        );
        setResult(totals);
      }
    } catch (e) {
      if (controller.signal.aborted) {
        append("warn", "Sync stopped by user.");
      } else {
        append("error", e instanceof Error ? e.message : "Sync failed.");
      }
    } finally {
      abortRef.current = null;
      setRunning(false);
      // Re-read the counts behind the log, so dismissing it shows what the run
      // actually achieved rather than what was there before it.
      router.refresh();
    }
  }, [router]);

  const showLog = running || logs.length > 0;

  if (showLog) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {running ? (
            <span className="flex items-center gap-2 font-medium">
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
              Syncing…
            </span>
          ) : (
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-4 text-green-600 dark:text-green-500" />
              Finished
            </span>
          )}

          <span className="text-muted-foreground tabular-nums">
            <span className="text-foreground font-semibold">
              {progress?.imported ?? 0}
            </span>
            {progress ? ` / ${progress.total}` : null} imported
          </span>

          {progress && progress.failed > 0 ? (
            <span className="text-destructive font-medium tabular-nums">
              {progress.failed} failed
            </span>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            {running ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => abortRef.current?.abort()}
              >
                <StopCircle className="size-4" />
                Stop
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setLogs([])}>
                Back to overview
              </Button>
            )}
          </div>
        </div>

        <SyncTerminal title="sync all" logs={logs} />

        {result ? (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-2 font-medium text-green-600 dark:text-green-500">
              <CheckCircle2 className="size-4" />
              {result.imported} imported
            </span>
            {result.failed > 0 ? (
              <span className="text-destructive flex items-center gap-2 font-medium">
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
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border p-4">
        {!confirming ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-muted-foreground text-sm">
              Copy everything from Directus into Supabase, in dependency order:
              doctor offices → insurance companies → medicines → insurance
              policies → patients → orders &amp; suborders. Existing rows are
              updated, not duplicated.
            </div>
            <Button onClick={() => setConfirming(true)}>
              <PlayCircle className="size-4" />
              Sync all
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">
              Run the full sync? It walks all six entities in order and can take
              several minutes.
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={runAll}>Confirm sync all</Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3")}>
        {SYNC_STEPS.map((step, index) => (
          <OverviewCard
            key={step.slug}
            title={step.label}
            counts={overview[step.card]}
            step={index + 1}
          />
        ))}
      </div>
    </div>
  );
}
