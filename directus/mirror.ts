import { createItem, readItems } from "@directus/sdk";

import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createDirectusServerClient } from "./server";

/**
 * Mirror rows created in Supabase back into the legacy Directus backend.
 *
 * The sync under `app/admin/sync` runs the other way (Directus → Supabase, a
 * one-off migration). This is the forward direction: a patient or order created
 * in this app also gets a row in Directus, linked by the `supabase_id` string
 * column that exists on the `patients`, `orders` and `subOrders` collections.
 *
 * **Everything here is best-effort.** It only ever runs *after* the Supabase
 * write has committed — that is where the id comes from — so a Directus outage,
 * a validation error, or a missing legacy record must never turn a successful
 * create into a failure the user sees. No function in this file throws: each
 * entry point catches its own errors and reports them in the returned
 * {@link MirrorResult}, which the callers log and otherwise ignore.
 *
 * Server-only — `createDirectusServerClient` uses the admin static token.
 */

type DirectusClient = ReturnType<typeof createDirectusServerClient>;
type ServerSupabase = SupabaseClient<Database>;
type Gender = Database["public"]["Enums"]["gender"];

export interface MirrorResult {
  ok: boolean;
  /** The Directus row id, when one was created or already existed. */
  directusId?: number;
  /** Why it was skipped, or what went wrong. Written to the server log. */
  message?: string;
}

/** Supabase stores the English enum; Directus stores the German labels. */
const GENDER_LABELS: Record<Gender, string> = {
  male: "Männlich",
  female: "Weiblich",
  other: "Divers",
};

// A number of Directus fields are `required` in their field meta while still
// being nullable in the database (street, city, insuranceNumber, …). Directus
// rejects null for those but accepts an empty string, and Supabase leaves them
// null whenever the form did — so an unset value is sent as "" rather than
// failing the whole row over an optional address line.
const text = (value: string | null | undefined) => value ?? "";

/** Collections this module writes to, all of which carry `supabase_id`. */
type MirrorCollection = "patients" | "orders" | "subOrders";

/**
 * Fully describe an error, walking the `cause` chain — a Directus SDK failure
 * puts the useful part (validation messages, the HTTP status) in `errors`, and
 * a network failure hides the real reason in `cause`.
 */
function describe(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    const errors = err.errors;
    if (Array.isArray(errors) && errors.length) {
      return errors
        .map((e) => String((e as { message?: unknown })?.message ?? e))
        .join("; ");
    }
    if (err.cause) return `${String(err.message ?? error)} (${describe(err.cause)})`;
    if (err.message) return String(err.message);
  }
  return String(error);
}

/** The id of the Directus row already mirroring this Supabase row, if any. */
async function findBySupabaseId(
  directus: DirectusClient,
  collection: MirrorCollection,
  supabaseId: string
): Promise<number | null> {
  const rows = (await directus.request(
    readItems(collection, {
      filter: { supabase_id: { _eq: supabaseId } },
      fields: ["id"],
      limit: 1,
    })
  )) as Array<{ id: number }>;
  return rows?.[0]?.id ?? null;
}

/**
 * Create the Directus row for a Supabase patient and return its id.
 *
 * Throws — the callers below turn that into a {@link MirrorResult}. The one
 * hard requirement Supabase does not share is `insuranceCompany`: it is NOT
 * NULL in Directus while `patients.insurance_company_id` is nullable here, so a
 * patient saved without one cannot be mirrored.
 */
async function createDirectusPatient(
  supabase: ServerSupabase,
  directus: DirectusClient,
  patientId: string
): Promise<number> {
  const { data: patient, error } = await supabase
    .from("patients")
    .select("*, insurance_companies (directus_id)")
    .eq("id", patientId)
    .single();

  if (error) throw new Error(`patient ${patientId} not readable: ${error.message}`);

  const insuranceCompany = patient.insurance_companies?.directus_id;
  if (insuranceCompany == null) {
    throw new Error(
      patient.insurance_company_id
        ? `insurance company ${patient.insurance_company_id} has no directus_id — it exists only in Supabase.`
        : "patient has no insurance company, which Directus requires."
    );
  }

  const created = (await directus.request(
    createItem("patients", {
      supabase_id: patient.id,
      firstName: patient.first_name,
      lastName: patient.last_name,
      dateOfBirth: patient.date_of_birth,
      gender: patient.gender ? GENDER_LABELS[patient.gender] : "",
      street: text(patient.street),
      houseNumber: text(patient.house_number),
      zipCode: text(patient.zipcode),
      city: text(patient.city),
      insuranceNumber: text(patient.insurance_number),
      insuranceCompany,
      // Doctor offices kept their uuid through the migration, so the same id
      // identifies the office on both sides.
      doctorOffice: patient.doctor_office_id,
      searchText: patient.search_text,
    })
  )) as { id: number };

  return created.id;
}

/**
 * The Directus id for a Supabase patient, creating the mirror row if it is
 * missing. Three cases, in order: a patient imported *from* Directus already
 * has its id in `directus_id`; a patient created here and already mirrored is
 * found by `supabase_id`; anything else is mirrored now.
 *
 * That last case matters for suborders — an order whose patient never made it
 * across (Directus was down when the patient was saved) would otherwise have
 * nothing to link to.
 */
async function resolveDirectusPatientId(
  supabase: ServerSupabase,
  directus: DirectusClient,
  patientId: string,
  knownDirectusId: number | null
): Promise<number> {
  if (knownDirectusId != null) return knownDirectusId;

  const existing = await findBySupabaseId(directus, "patients", patientId);
  if (existing != null) return existing;

  return createDirectusPatient(supabase, directus, patientId);
}

/**
 * Mirror a newly created patient into Directus. Never throws.
 */
export async function mirrorPatientToDirectus(
  supabase: ServerSupabase,
  patientId: string
): Promise<MirrorResult> {
  try {
    const directus = createDirectusServerClient();

    const existing = await findBySupabaseId(directus, "patients", patientId);
    if (existing != null) {
      return { ok: true, directusId: existing, message: "already mirrored" };
    }

    const directusId = await createDirectusPatient(supabase, directus, patientId);
    return { ok: true, directusId };
  } catch (error) {
    const message = describe(error);
    console.error(`[directus-mirror] patient ${patientId} failed: ${message}`, error);
    return { ok: false, message };
  }
}

/**
 * Mirror a newly created order — and each of its suborders — into Directus.
 * Never throws.
 *
 * The suborders are created one at a time so a single unmirrorable patient
 * costs that one suborder rather than the whole order; the ones that failed are
 * named in the returned message.
 */
export async function mirrorOrderToDirectus(
  supabase: ServerSupabase,
  orderId: string
): Promise<MirrorResult> {
  try {
    const directus = createDirectusServerClient();

    const existing = await findBySupabaseId(directus, "orders", orderId);
    if (existing != null) {
      return { ok: true, directusId: existing, message: "already mirrored" };
    }

    // Read the order back *after* its suborders were inserted: `search_text` is
    // trigger-maintained and only includes the suborders once they exist.
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        `*,
         medicine (directus_id),
         suborders (*, patients (id, directus_id))`
      )
      .eq("id", orderId)
      .single();

    if (error) throw new Error(`order ${orderId} not readable: ${error.message}`);

    const medicine = order.medicine?.directus_id;
    if (medicine == null) {
      throw new Error(
        `medicine ${order.medicine_id} has no directus_id — it exists only in Supabase.`
      );
    }

    const createdOrder = (await directus.request(
      createItem("orders", {
        supabase_id: order.id,
        medicine,
        quantity: order.quantity,
        doctorOffice: order.doctor_office_id,
        applicationDate: order.application_date,
        deliveryDate: order.delivery_date,
        // The column default, and the state every new order starts in.
        status: "Prüfung",
        searchText: order.search_text,
      })
    )) as { id: number };

    const failures: string[] = [];

    for (const suborder of order.suborders ?? []) {
      try {
        const patient = await resolveDirectusPatientId(
          supabase,
          directus,
          suborder.patient_id,
          suborder.patients?.directus_id ?? null
        );

        await directus.request(
          createItem("subOrders", {
            supabase_id: suborder.id,
            order: createdOrder.id,
            patient,
            leftEye: suborder.left_eye,
            rightEye: suborder.right_eye,
            // Praxis / Kasse / Patient — the same labels on both sides.
            invoice: suborder.invoice_type,
            searchText: suborder.search_text,
          })
        );
      } catch (subError) {
        const message = describe(subError);
        console.error(
          `[directus-mirror] suborder ${suborder.id} of order ${orderId} failed: ${message}`,
          subError
        );
        failures.push(`${suborder.id}: ${message}`);
      }
    }

    if (failures.length) {
      return {
        ok: false,
        directusId: createdOrder.id,
        message: `order mirrored, ${failures.length} suborder(s) failed — ${failures.join(" | ")}`,
      };
    }

    return { ok: true, directusId: createdOrder.id };
  } catch (error) {
    const message = describe(error);
    console.error(`[directus-mirror] order ${orderId} failed: ${message}`, error);
    return { ok: false, message };
  }
}
