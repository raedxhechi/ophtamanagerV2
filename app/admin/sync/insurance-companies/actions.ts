"use server";

import { aggregate, readItems } from "@directus/sdk";

import { createDirectusServerClient } from "@/directus/server";
import { createClient } from "@/supabase/server";
import type { Database } from "@/types/supabase";

import {
  failResult,
  type ImportError,
  type ImportResult,
  type SyncCounts,
} from "../types";

type InsuranceType = Database["public"]["Enums"]["insurance_type"];
type InsuranceCompanyInsert =
  Database["public"]["Tables"]["insurance_companies"]["Insert"];

interface DirectusInsuranceCompany {
  id: number;
  name?: string | null;
  ikNumber?: string | null;
  type?: string | null;
}

const DIRECTUS_FIELDS = ["id", "name", "ikNumber", "type"];

function mapInsuranceType(
  value: string | null | undefined
): InsuranceType | null {
  const v = String(value ?? "").trim();
  return v === "Privat" || v === "Gesetzlich" ? (v as InsuranceType) : null;
}

export async function getInsuranceCompanyCounts(): Promise<SyncCounts> {
  const directus = createDirectusServerClient();
  const agg = (await directus.request(
    aggregate("insuranceCompanies", { aggregate: { count: "*" } })
  )) as Array<{ count: string | number | null }>;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("insurance_companies")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);

  return { directus: Number(agg?.[0]?.count ?? 0), supabase: count ?? 0 };
}

/**
 * Copy all insurance companies from Directus, preserving the origin id in
 * directus_id (needed to later resolve patients.insuranceCompany).
 */
export async function importInsuranceCompanies(): Promise<ImportResult> {
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

  const directus = createDirectusServerClient();
  const items = (await directus.request(
    readItems("insuranceCompanies", { limit: -1, fields: DIRECTUS_FIELDS })
  )) as DirectusInsuranceCompany[];

  const errors: ImportError[] = [];
  let imported = 0;

  const BATCH = 25;
  for (let i = 0; i < items.length; i += BATCH) {
    const slice = items.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map(async (c) => {
        const directusId = Number(c.id);

        if (!c.name) {
          return {
            ok: false as const,
            directusId,
            message: "Missing required field (name).",
          };
        }
        const insuranceType = mapInsuranceType(c.type);
        if (!insuranceType) {
          return {
            ok: false as const,
            directusId,
            message: `Unknown insurance type: "${c.type ?? ""}".`,
          };
        }

        const row: InsuranceCompanyInsert = {
          directus_id: directusId,
          name: c.name,
          insurance_type: insuranceType,
          iknumber: c.ikNumber ?? null,
        };

        const { error } = await supabase
          .from("insurance_companies")
          .upsert(row, { onConflict: "directus_id" });
        if (error) {
          return { ok: false as const, directusId, message: error.message };
        }
        return { ok: true as const, directusId };
      })
    );

    for (const r of results) {
      if (r.ok) imported++;
      else errors.push({ directusId: r.directusId, message: r.message });
    }
  }

  return { total: items.length, imported, failed: errors.length, errors };
}
