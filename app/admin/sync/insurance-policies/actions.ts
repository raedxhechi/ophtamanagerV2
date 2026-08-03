"use server";

import { aggregate, readItems } from "@directus/sdk";

import { createDirectusServerClient } from "@/directus/server";
import { createClient } from "@/supabase/server";

import {
  failResult,
  type ImportError,
  type ImportResult,
  type ImportWarning,
  type SyncCounts,
} from "../types";

/** insurancePolicies.id is a uuid in Directus — kept as the Supabase PK. */
interface DirectusPolicy {
  id: string;
  doctorOffice?: string | null;
}

interface DirectusPolicyMedicine {
  insurancePolicies_id: string;
  medicines_id: number;
}

interface DirectusPolicyCompany {
  insurancePolicies_id: string;
  insuranceCompanies_id: number;
}

export async function getInsurancePolicyCounts(): Promise<SyncCounts> {
  const directus = createDirectusServerClient();
  const agg = (await directus.request(
    aggregate("insurancePolicies", { aggregate: { count: "*" } })
  )) as Array<{ count: string | number | null }>;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("insurance_policy")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);

  return { directus: Number(agg?.[0]?.count ?? 0), supabase: count ?? 0 };
}

/**
 * Copy insurance policies (uuid id preserved) plus their many-to-many links to
 * medicines and insurance companies. Link targets are resolved through
 * directus_id; any that aren't in Supabase yet are reported as warnings so the
 * broken connection is visible rather than silently dropped.
 */
export async function importInsurancePolicies(): Promise<ImportResult> {
  const supabase = await createClient();

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

  // Resolution maps: Directus integer id -> Supabase uuid.
  const [{ data: meds }, { data: companies }] = await Promise.all([
    supabase.from("medicine").select("id, directus_id"),
    supabase.from("insurance_companies").select("id, directus_id"),
  ]);
  const medicineByDirectusId = new Map<number, string>();
  for (const m of meds ?? []) {
    if (m.directus_id != null) medicineByDirectusId.set(Number(m.directus_id), m.id);
  }
  const companyByDirectusId = new Map<number, string>();
  for (const c of companies ?? []) {
    if (c.directus_id != null) companyByDirectusId.set(Number(c.directus_id), c.id);
  }

  const directus = createDirectusServerClient();
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];

  // 1. Policies (uuid id preserved; doctorOffice maps straight to the uuid FK).
  const policies = (await directus.request(
    readItems("insurancePolicies", { limit: -1, fields: ["id", "doctorOffice"] })
  )) as DirectusPolicy[];

  let imported = 0;
  const BATCH = 25;
  for (let i = 0; i < policies.length; i += BATCH) {
    const slice = policies.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map(async (p) => {
        if (!p.id) {
          return { ok: false as const, directusId: "-", message: "Missing policy id." };
        }
        const { error } = await supabase
          .from("insurance_policy")
          .upsert(
            { id: p.id, doctor_office_id: p.doctorOffice ?? null },
            { onConflict: "id" }
          );
        if (error) {
          return { ok: false as const, directusId: p.id, message: error.message };
        }
        return { ok: true as const, directusId: p.id };
      })
    );
    for (const r of results) {
      if (r.ok) imported++;
      else errors.push({ directusId: r.directusId, message: r.message });
    }
  }

  // 2. Policy <-> medicine links.
  const medLinks = (await directus.request(
    readItems("insurancePolicies_medicines", {
      limit: -1,
      fields: ["insurancePolicies_id", "medicines_id"],
    })
  )) as DirectusPolicyMedicine[];

  for (let i = 0; i < medLinks.length; i += BATCH) {
    const slice = medLinks.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (link) => {
        const medicineId = medicineByDirectusId.get(Number(link.medicines_id));
        if (!medicineId) {
          warnings.push({
            directusId: link.insurancePolicies_id,
            message: `Medicine #${link.medicines_id} not found in Supabase — link skipped. Import medicines first, then re-run.`,
          });
          return;
        }
        const { error } = await supabase
          .from("insurance_policy_medicines")
          .upsert(
            { insurance_policy_id: link.insurancePolicies_id, medicine_id: medicineId },
            { onConflict: "insurance_policy_id,medicine_id" }
          );
        if (error) {
          errors.push({ directusId: link.insurancePolicies_id, message: error.message });
        }
      })
    );
  }

  // 3. Policy <-> insurance-company links.
  const companyLinks = (await directus.request(
    readItems("insurancePolicies_insuranceCompanies", {
      limit: -1,
      fields: ["insurancePolicies_id", "insuranceCompanies_id"],
    })
  )) as DirectusPolicyCompany[];

  for (let i = 0; i < companyLinks.length; i += BATCH) {
    const slice = companyLinks.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (link) => {
        const companyId = companyByDirectusId.get(
          Number(link.insuranceCompanies_id)
        );
        if (!companyId) {
          warnings.push({
            directusId: link.insurancePolicies_id,
            message: `Insurance company #${link.insuranceCompanies_id} not found in Supabase — link skipped. Import insurance companies first, then re-run.`,
          });
          return;
        }
        const { error } = await supabase
          .from("insurance_policy_insurance_companies")
          .upsert(
            {
              insurance_policy_id: link.insurancePolicies_id,
              insurance_company_id: companyId,
            },
            { onConflict: "insurance_policy_id,insurance_company_id" }
          );
        if (error) {
          errors.push({ directusId: link.insurancePolicies_id, message: error.message });
        }
      })
    );
  }

  return {
    total: policies.length,
    imported,
    failed: errors.length,
    errors,
    warnings,
  };
}
