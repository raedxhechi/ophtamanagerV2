"use server";

import { aggregate, readItems } from "@directus/sdk";

import { createDirectusServerClient } from "@/directus/server";
import { createClient } from "@/supabase/server";
import type { Database } from "@/types/supabase";

import {
  failResult,
  type ImportError,
  type ImportResult,
  type ImportWarning,
  type SyncCounts,
} from "../types";

type Gender = Database["public"]["Enums"]["gender"];
type PatientInsert = Database["public"]["Tables"]["patients"]["Insert"];

/** Shape of the patient fields we read out of Directus. */
interface DirectusPatient {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  insuranceNumber?: string | null;
  city?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  zipCode?: string | null;
  doctorOffice?: string | null;
  insuranceCompany?: number | null;
}

const DIRECTUS_FIELDS = [
  "id",
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "insuranceNumber",
  "city",
  "street",
  "houseNumber",
  "zipCode",
  "doctorOffice",
  "insuranceCompany",
];

// Directus stores gender as German labels (Männlich / Weiblich / Divers);
// Supabase uses the English enum (male / female / other). Also accept the
// English values so re-imports stay idempotent.
const GENDER_MAP: Record<string, Gender> = {
  männlich: "male",
  weiblich: "female",
  divers: "other",
  male: "male",
  female: "female",
  other: "other",
};

function mapGender(value: string | null | undefined): Gender | null {
  const v = String(value ?? "").trim().toLowerCase();
  return GENDER_MAP[v] ?? null;
}

/** Count of patients in Directus and in Supabase, for the pre-import view. */
export async function getPatientCounts(): Promise<SyncCounts> {
  const directus = createDirectusServerClient();
  const agg = (await directus.request(
    aggregate("patients", { aggregate: { count: "*" } })
  )) as Array<{ count: string | number | null }>;
  const directusCount = Number(agg?.[0]?.count ?? 0);

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("patients")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);

  return { directus: directusCount, supabase: count ?? 0 };
}

/**
 * Copy all patients from Directus into Supabase, preserving the Directus id in
 * `directus_id`. Idempotent: re-running upserts on directus_id. Errors are
 * collected per row so one bad record doesn't block the rest.
 */
export async function importPatients(): Promise<ImportResult> {
  const supabase = await createClient();

  // Admins only: RLS lets admins insert patients for any office.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return failResult("Not authenticated.");
  }
  const { data: profile } = await supabase
    .from("user_data")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return failResult("Only admins can run this import.");
  }

  // Map Directus insurance-company ids -> Supabase uuids (via directus_id) so we
  // can resolve each patient's insurance_company_id. Requires insurance
  // companies to have been imported first; unmatched ids are left null.
  const { data: companies } = await supabase
    .from("insurance_companies")
    .select("id, directus_id");
  const companyUuidByDirectusId = new Map<number, string>();
  for (const c of companies ?? []) {
    if (c.directus_id != null) {
      companyUuidByDirectusId.set(Number(c.directus_id), c.id);
    }
  }

  const directus = createDirectusServerClient();
  const items = (await directus.request(
    readItems("patients", { limit: -1, fields: DIRECTUS_FIELDS })
  )) as DirectusPatient[];

  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];
  let imported = 0;

  // Small concurrent batches: fast, but still per-row error isolation.
  const BATCH = 25;
  for (let i = 0; i < items.length; i += BATCH) {
    const slice = items.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map(async (p) => {
        const directusId = Number(p.id);

        if (!p.firstName || !p.lastName || !p.dateOfBirth || !p.doctorOffice) {
          return {
            ok: false as const,
            directusId,
            message:
              "Missing required field (first name, last name, date of birth, or doctor office).",
          };
        }

        // Resolve the insurance company via its Directus id -> Supabase uuid.
        const insuranceCompanyId =
          p.insuranceCompany != null
            ? (companyUuidByDirectusId.get(Number(p.insuranceCompany)) ?? null)
            : null;

        // Referenced but not found: keep the patient, but flag the broken link.
        const warning =
          p.insuranceCompany != null && insuranceCompanyId === null
            ? `Insurance company #${p.insuranceCompany} not found in Supabase — link left empty. Import insurance companies first, then re-run.`
            : undefined;

        const row: PatientInsert = {
          directus_id: directusId,
          first_name: p.firstName,
          last_name: p.lastName,
          date_of_birth: p.dateOfBirth,
          gender: mapGender(p.gender),
          insurance_number: p.insuranceNumber ?? null,
          city: p.city ?? null,
          street: p.street ?? null,
          house_number: p.houseNumber ?? null,
          zipcode: p.zipCode ?? null,
          doctor_office_id: p.doctorOffice,
          insurance_company_id: insuranceCompanyId,
        };

        const { error } = await supabase
          .from("patients")
          .upsert(row, { onConflict: "directus_id" });
        if (error) {
          return { ok: false as const, directusId, message: error.message };
        }
        return { ok: true as const, directusId, warning };
      })
    );

    for (const r of results) {
      if (r.ok) {
        imported++;
        if (r.warning) {
          warnings.push({ directusId: r.directusId, message: r.warning });
        }
      } else {
        errors.push({ directusId: r.directusId, message: r.message });
      }
    }
  }

  return {
    total: items.length,
    imported,
    failed: errors.length,
    errors,
    warnings,
  };
}
