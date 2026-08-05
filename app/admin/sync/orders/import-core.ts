import { readItems } from "@directus/sdk";

import { createDirectusServerClient } from "@/directus/server";
import { createClient } from "@/supabase/server";
import type { Database } from "@/types/supabase";

import {
  failResult,
  type ImportError,
  type ImportResult,
  type ImportWarning,
  type SyncEvent,
  type SyncLogLevel,
} from "../types";

type InvoiceType = Database["public"]["Enums"]["invoice_types"];
type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
type SubOrderInsert = Database["public"]["Tables"]["suborders"]["Insert"];
type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/** Order fields we read out of Directus. `doctorOffice` keeps the same uuid in
 * Supabase; `medicine` is a Directus integer id resolved via directus_id. */
interface DirectusOrder {
  id: number;
  medicine?: number | null;
  quantity?: number | null;
  doctorOffice?: string | null;
  applicationDate?: string | null;
  deliveryDate?: string | null;
  date_created?: string | null;
}

/** Suborder fields we read out of Directus. `order` and `patient` are Directus
 * integer ids resolved via directus_id. */
interface DirectusSubOrder {
  id: number;
  order?: number | null;
  patient?: number | string | null;
  leftEye?: boolean | null;
  rightEye?: boolean | null;
  invoice?: string | null;
  date_created?: string | null;
}

/** Patient fields fetched from Directus to describe a broken-link suborder. */
interface DirectusPatientDetail {
  id: number | string;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  insuranceNumber?: string | null;
}

const ORDER_FIELDS = [
  "id",
  "medicine",
  "quantity",
  "doctorOffice",
  "applicationDate",
  "deliveryDate",
  "date_created",
];

const SUBORDER_FIELDS = [
  "id",
  "order",
  "patient",
  "leftEye",
  "rightEye",
  "invoice",
  "date_created",
];

// Directus stores the invoice target as one of these German labels, matching the
// Supabase `invoice_types` enum exactly. Anything else is left unset.
const INVOICE_VALUES: InvoiceType[] = ["Praxis", "Kasse", "Patient"];

function mapInvoice(value: string | null | undefined): InvoiceType | null {
  const v = String(value ?? "").trim();
  return (INVOICE_VALUES as string[]).includes(v) ? (v as InvoiceType) : null;
}

const log = (level: SyncLogLevel, message: string): SyncEvent => ({
  type: "log",
  level,
  message,
});

/**
 * Fully describe an error, walking the `cause` chain. Supabase/undici surface
 * network failures as a bare `TypeError: fetch failed` whose real reason (DNS,
 * ECONNREFUSED, TLS, …) only lives in `.cause`; this pulls that out along with
 * any Postgrest fields (code/details/hint) so the message is actually useful.
 */
export function describeError(e: unknown): string {
  const lines: string[] = [];
  const seen = new Set<unknown>();
  let cur: unknown = e;
  let prefix = "";
  while (cur && typeof cur === "object" && !seen.has(cur)) {
    seen.add(cur);
    const err = cur as Record<string, unknown>;
    const name = (err.name as string) ?? "Error";
    const message = (err.message as string) ?? String(cur);
    lines.push(`${prefix}${name}: ${message}`);
    for (const key of [
      "code",
      "details",
      "hint",
      "errno",
      "syscall",
      "address",
      "port",
    ]) {
      if (err[key] != null) lines.push(`${prefix}  ${key}: ${String(err[key])}`);
    }
    cur = err.cause;
    prefix += "  ↳ caused by ";
  }
  if (lines.length === 0) lines.push(String(e));
  return lines.join("\n");
}

const BATCH = 25;
// Supabase caps a select at 1000 rows by default, so lookup maps must be paged
// or they silently truncate (which mis-flags every referenced row past #1000).
const PAGE = 1000;

/**
 * Build a Directus-id → Supabase-uuid map for a table, paging through every row
 * so the map is complete (not capped at Supabase's 1000-row select default).
 */
async function loadDirectusIdMap(
  supabase: ServerSupabase,
  table: "medicine" | "patients" | "orders"
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select("id, directus_id")
      .not("directus_id", "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data ?? [];
    for (const r of rows) {
      if (r.directus_id != null) map.set(Number(r.directus_id), r.id);
    }
    if (rows.length < PAGE) break;
  }
  return map;
}

/**
 * Describe a suborder whose parent order doesn't exist in Directus (a broken
 * link), pulling the linked patient's details from Directus when that patient
 * still exists. Returned as a non-fatal warning so the row can be skipped and
 * surfaced at the end instead of aborting the import.
 */
async function buildBrokenOrderWarning(
  directus: ReturnType<typeof createDirectusServerClient>,
  s: DirectusSubOrder
): Promise<ImportWarning> {
  const parts = [
    `references order #${s.order}, which does not exist in Directus (broken link) — skipped.`,
    `Suborder: leftEye=${!!s.leftEye}, rightEye=${!!s.rightEye}, invoice=${s.invoice ?? "—"}.`,
  ];

  if (s.patient != null) {
    try {
      const found = (await directus.request(
        readItems("patients", {
          filter: { id: { _eq: s.patient } },
          limit: 1,
          fields: [
            "id",
            "firstName",
            "lastName",
            "dateOfBirth",
            "insuranceNumber",
          ],
        })
      )) as DirectusPatientDetail[];
      const p = found?.[0];
      if (p) {
        const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "(no name)";
        parts.push(
          `Patient #${s.patient}: ${name}, DOB ${p.dateOfBirth ?? "?"}, insurance ${p.insuranceNumber ?? "?"}.`
        );
      } else {
        parts.push(`Patient #${s.patient}: not found in Directus either.`);
      }
    } catch (e) {
      parts.push(`Patient #${s.patient}: lookup failed (${describeError(e)}).`);
    }
  } else {
    parts.push("Patient: none linked.");
  }

  return { directusId: `sub:${Number(s.id)}`, message: parts.join(" ") };
}

/**
 * Import orders (and their suborders) from Directus into Supabase as a stream of
 * {@link SyncEvent}s: `log` lines narrate each phase, `progress` events report
 * the running imported count, and a final `result` carries the summary (also
 * returned, so a non-streaming caller can take the return value).
 *
 * Fail-fast on genuine errors: the first row that errors (a failed upsert, a
 * missing required field, an abort via `signal`, or an import inconsistency)
 * halts the whole import. The one non-fatal case is a suborder whose parent
 * order doesn't exist in Directus at all — a broken link — which is skipped and
 * reported as a warning with the suborder + patient details.
 */
export async function* importOrdersEvents(
  signal?: AbortSignal
): AsyncGenerator<SyncEvent, ImportResult, void> {
  const supabase = await createClient();

  // Admins only: RLS lets admins insert orders/suborders for any office.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const result = failResult("Not authenticated.");
    yield log("error", "Not authenticated.");
    yield { type: "result", result };
    return result;
  }
  const { data: profile } = await supabase
    .from("user_data")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    const result = failResult("Only admins can run this import.");
    yield log("error", "Only admins can run this import.");
    yield { type: "result", result };
    return result;
  }

  // Directus-id → Supabase-uuid maps (fully paged, so nothing is truncated).
  yield log("info", "Loading medicine and patient lookup tables…");
  const medicineUuidByDirectusId = await loadDirectusIdMap(supabase, "medicine");
  const patientUuidByDirectusId = await loadDirectusIdMap(supabase, "patients");
  yield log(
    "info",
    `Loaded ${medicineUuidByDirectusId.size} medicines and ${patientUuidByDirectusId.size} patients.`
  );

  const directus = createDirectusServerClient();
  yield log("info", "Fetching orders and suborders from Directus…");
  const orders = (await directus.request(
    readItems("orders", { limit: -1, fields: ORDER_FIELDS })
  )) as DirectusOrder[];
  const subOrders = (await directus.request(
    readItems("subOrders", { limit: -1, fields: SUBORDER_FIELDS })
  )) as DirectusSubOrder[];
  const total = orders.length + subOrders.length;
  yield log(
    "info",
    `Fetched ${orders.length} orders and ${subOrders.length} suborders.`
  );

  // Every order id that actually exists in Directus (the authoritative set for
  // this run). Used to tell an import bug from a broken suborder link.
  const directusOrderIds = new Set<number>(orders.map((o) => Number(o.id)));

  // Fallback quantity: an order's quantity is a per-eye count, so if Directus has
  // none we derive it from its suborders (each treated eye counts as one), the
  // same rule the create-order form uses.
  const eyeCountByOrder = new Map<number, number>();
  for (const s of subOrders) {
    if (s.order == null) continue;
    const orderId = Number(s.order);
    const eyes = (s.leftEye ? 1 : 0) + (s.rightEye ? 1 : 0);
    eyeCountByOrder.set(orderId, (eyeCountByOrder.get(orderId) ?? 0) + eyes);
  }

  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];
  let imported = 0;

  // Record a failed row and keep going: log the raw error to the dev console
  // (with stack + cause) and collect a fully-described error to show at the end.
  // The import never aborts on a row error — every failure is preserved.
  const recordError = (
    label: string,
    directusId: string | number,
    rawError: unknown
  ): string => {
    const message = describeError(rawError);
    // console.log (not console.error) per request — keeps the raw object, so the
    // dev console can expand its `cause`/stack.
    console.log(`[orders-sync] ${label} #${directusId} failed:`, rawError);
    errors.push({ directusId, message });
    return message;
  };

  // --- Orders ---------------------------------------------------------------
  yield log("info", `Importing ${orders.length} orders…`);
  for (let i = 0; i < orders.length; i += BATCH) {
    if (signal?.aborted) {
      yield log("warn", "Import stopped.");
      const result = { total, imported, failed: errors.length, errors, warnings };
      yield { type: "result", result };
      return result;
    }

    const slice = orders.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map(async (o) => {
        const directusId = Number(o.id);

        if (!o.doctorOffice) {
          return {
            ok: false as const,
            directusId,
            error: new Error("Missing required field (doctor office)."),
          };
        }
        if (o.medicine == null) {
          return {
            ok: false as const,
            directusId,
            error: new Error("Missing required field (medicine)."),
          };
        }

        const medicineId = medicineUuidByDirectusId.get(Number(o.medicine));
        if (!medicineId) {
          return {
            ok: false as const,
            directusId,
            error: new Error(
              `Medicine #${o.medicine} not found in Supabase — import medicines first, then re-run.`
            ),
          };
        }

        const quantity =
          o.quantity != null
            ? Number(o.quantity)
            : (eyeCountByOrder.get(directusId) ?? 0);

        const row: OrderInsert = {
          directus_id: directusId,
          medicine_id: medicineId,
          quantity,
          doctor_office_id: o.doctorOffice,
          application_date: o.applicationDate ?? null,
          delivery_date: o.deliveryDate ?? null,
          // Preserve the original Directus creation date; omit (→ default now())
          // only when Directus has none.
          ...(o.date_created ? { created_at: o.date_created } : {}),
        };

        try {
          const { error } = await supabase
            .from("orders")
            .upsert(row, { onConflict: "directus_id" });
          if (error) return { ok: false as const, directusId, error };
          return { ok: true as const, directusId };
        } catch (error) {
          return { ok: false as const, directusId, error };
        }
      })
    );

    for (const r of results) {
      if (r.ok) {
        imported++;
      } else {
        const message = recordError("Order", r.directusId, r.error);
        yield log("error", `Order #${r.directusId}: ${message}`);
      }
    }

    yield { type: "progress", imported, failed: errors.length, total };
  }
  yield log(
    errors.length ? "warn" : "success",
    `Orders done: ${imported} imported${errors.length ? `, ${errors.length} failed` : ""}.`
  );

  // Now that orders exist, map Directus order ids -> Supabase order uuids so
  // suborders can link to their parent (fully paged — see loadDirectusIdMap).
  const orderUuidByDirectusId = await loadDirectusIdMap(supabase, "orders");

  // --- Suborders ------------------------------------------------------------
  yield log("info", `Linking ${subOrders.length} suborders…`);
  let subImported = 0;
  for (let i = 0; i < subOrders.length; i += BATCH) {
    if (signal?.aborted) {
      yield log("warn", "Import stopped.");
      const result = {
        total,
        imported: imported + subImported,
        failed: errors.length,
        errors,
        warnings,
      };
      yield { type: "result", result };
      return result;
    }

    const slice = subOrders.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map(
        async (
          s
        ): Promise<
          | { ok: true; directusId: number }
          | { ok: false; kind: "error"; directusId: number | string; error: unknown }
          | { ok: false; kind: "warning"; warning: ImportWarning }
        > => {
          const directusId = Number(s.id);

          if (s.order == null) {
            return {
              ok: false,
              kind: "error",
              directusId,
              error: new Error("Missing required field (order)."),
            };
          }
          if (s.patient == null) {
            return {
              ok: false,
              kind: "error",
              directusId,
              error: new Error("Missing required field (patient)."),
            };
          }

          const orderId = orderUuidByDirectusId.get(Number(s.order));
          if (!orderId) {
            // The order isn't in Supabase. Is it in Directus?
            if (directusOrderIds.has(Number(s.order))) {
              // Yes — it should have been imported: a real inconsistency. Record
              // it and keep going (no longer aborts).
              return {
                ok: false,
                kind: "error",
                directusId,
                error: new Error(
                  `Order #${s.order} exists in Directus but was not imported to Supabase — import inconsistency.`
                ),
              };
            }
            // No — broken link. Skip it and flag it as a warning.
            const warning = await buildBrokenOrderWarning(directus, s);
            return { ok: false, kind: "warning", warning };
          }

          const patientId = patientUuidByDirectusId.get(Number(s.patient));
          if (!patientId) {
            return {
              ok: false,
              kind: "error",
              directusId,
              error: new Error(
                `Patient #${s.patient} not found in Supabase — import patients first, then re-run.`
              ),
            };
          }

          const row: SubOrderInsert = {
            directus_id: directusId,
            order_id: orderId,
            patient_id: patientId,
            left_eye: s.leftEye ?? false,
            right_eye: s.rightEye ?? false,
            invoice_type: mapInvoice(s.invoice),
            // Preserve the original Directus creation date; omit (→ default
            // now()) only when Directus has none.
            ...(s.date_created ? { created_at: s.date_created } : {}),
          };

          try {
            const { error } = await supabase
              .from("suborders")
              .upsert(row, { onConflict: "directus_id" });
            if (error) return { ok: false, kind: "error", directusId, error };
            return { ok: true, directusId };
          } catch (error) {
            return { ok: false, kind: "error", directusId, error };
          }
        }
      )
    );

    for (const r of results) {
      if (r.ok) {
        subImported++;
      } else if (r.kind === "warning") {
        warnings.push(r.warning);
        yield log("warn", `${r.warning.directusId} ${r.warning.message}`);
      } else {
        const message = recordError("Suborder", r.directusId, r.error);
        yield log("error", `Suborder #${r.directusId}: ${message}`);
      }
    }

    yield {
      type: "progress",
      imported: imported + subImported,
      failed: errors.length,
      total,
    };
  }
  yield log(
    errors.length || warnings.length ? "warn" : "success",
    `Suborders done: ${subImported} linked${warnings.length ? `, ${warnings.length} skipped (broken links)` : ""}.`
  );

  const result: ImportResult = {
    total,
    imported: imported + subImported,
    failed: errors.length,
    errors,
    warnings,
  };
  yield log(
    errors.length ? "error" : warnings.length ? "warn" : "success",
    `Finished: ${result.imported} of ${result.total} imported${errors.length ? `, ${errors.length} failed` : ""}${warnings.length ? `, ${warnings.length} warnings` : ""}.`
  );
  yield { type: "result", result };
  return result;
}
