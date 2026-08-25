import { importDoctorOffices } from "../doctor-offices/actions";
import { importInsuranceCompanies } from "../insurance-companies/actions";
import { importInsurancePolicies } from "../insurance-policies/actions";
import { importMedicines } from "../medicines/actions";
import { describeError, importOrdersEvents } from "../orders/import-core";
import { importPatients } from "../patients/actions";
import type { ImportResult, SyncEvent, SyncLogLevel } from "../types";

const log = (level: SyncLogLevel, message: string): SyncEvent => ({
  type: "log",
  level,
  message,
});

/** Enough detail to act on, without a wall of near-identical lines. */
const MAX_LINES_PER_KIND = 25;

/** The five importers that return a finished result rather than streaming. */
const BATCH_RUNNERS: Record<string, () => Promise<ImportResult>> = {
  "doctor-offices": importDoctorOffices,
  "insurance-companies": importInsuranceCompanies,
  medicines: importMedicines,
  "insurance-policies": importInsurancePolicies,
  patients: importPatients,
};

/** Turn one step's result into log lines. */
function* describeResult(
  label: string,
  result: ImportResult
): Generator<SyncEvent> {
  const warnings = result.warnings ?? [];

  for (const err of result.errors.slice(0, MAX_LINES_PER_KIND)) {
    yield log("error", `  #${err.directusId}: ${err.message}`);
  }
  if (result.errors.length > MAX_LINES_PER_KIND) {
    yield log(
      "error",
      `  … and ${result.errors.length - MAX_LINES_PER_KIND} more errors`
    );
  }

  for (const warn of warnings.slice(0, MAX_LINES_PER_KIND)) {
    yield log("warn", `  #${warn.directusId}: ${warn.message}`);
  }
  if (warnings.length > MAX_LINES_PER_KIND) {
    yield log(
      "warn",
      `  … and ${warnings.length - MAX_LINES_PER_KIND} more warnings`
    );
  }

  const summary =
    `${label}: ${result.imported}/${result.total} imported` +
    (result.failed > 0 ? `, ${result.failed} failed` : "") +
    (warnings.length > 0 ? `, ${warnings.length} warnings` : "");

  yield log(result.failed > 0 ? "error" : "success", summary);
}

/** Whether a slug names a step this route knows how to run. */
export function isSyncStep(slug: string): boolean {
  return slug === "orders" || slug in BATCH_RUNNERS;
}

/**
 * Run exactly one step of the full sync, as a stream of {@link SyncEvent}s.
 *
 * One step per request is the whole point: each gets its own request timeout
 * rather than six entities sharing one budget, which is what a hand-run sync
 * has always done — click patients, wait, click orders. The client walks
 * SYNC_STEPS and calls this once per slug, so nothing has to finish within any
 * other step's clock.
 *
 * Orders are the one importer that already streams; its events are forwarded
 * as they arrive rather than collapsed into a summary, because its account of a
 * suborder whose patient never made it across is the most useful output in the
 * run. The other five report their result once, described line by line.
 */
export async function* runSyncStep(
  slug: string,
  label: string,
  signal: AbortSignal
): AsyncGenerator<SyncEvent> {
  if (slug === "orders") {
    yield* importOrdersEvents(signal);
    return;
  }

  const run = BATCH_RUNNERS[slug];
  if (!run) {
    const message = `Unknown sync step "${slug}".`;
    yield log("error", message);
    yield {
      type: "result",
      result: {
        total: 0,
        imported: 0,
        failed: 1,
        errors: [{ directusId: "-", message }],
      },
    };
    return;
  }

  try {
    const result = await run();
    yield* describeResult(label, result);
    yield {
      type: "progress",
      imported: result.imported,
      failed: result.failed,
      total: result.total,
    };
    yield { type: "result", result };
  } catch (e) {
    // A step that throws is reported as that step's failure, not as the route
    // falling over — the client carries on to the next one.
    const message = describeError(e);
    yield log("error", `${label}: crashed — ${message}`);
    yield {
      type: "result",
      result: {
        total: 0,
        imported: 0,
        failed: 1,
        errors: [{ directusId: label, message }],
      },
    };
  }
}
