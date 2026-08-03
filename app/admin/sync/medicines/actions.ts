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

type MedicineType = Database["public"]["Enums"]["medicine_type"];
type MedicineInsert = Database["public"]["Tables"]["medicine"]["Insert"];

interface DirectusMedicine {
  id: number;
  name?: string | null;
  medicine_type?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
}

const DIRECTUS_FIELDS = [
  "id",
  "name",
  "medicine_type",
  "backgroundColor",
  "textColor",
];

function mapMedicineType(value: string | null | undefined): MedicineType | null {
  const v = String(value ?? "").trim();
  return v === "Rezeptur" || v === "Fertigarzneimittel"
    ? (v as MedicineType)
    : null;
}

export async function getMedicineCounts(): Promise<SyncCounts> {
  const directus = createDirectusServerClient();
  const agg = (await directus.request(
    aggregate("medicines", { aggregate: { count: "*" } })
  )) as Array<{ count: string | number | null }>;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("medicine")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);

  return { directus: Number(agg?.[0]?.count ?? 0), supabase: count ?? 0 };
}

/** Copy all medicines from Directus, preserving the origin id in directus_id. */
export async function importMedicines(): Promise<ImportResult> {
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
    readItems("medicines", { limit: -1, fields: DIRECTUS_FIELDS })
  )) as DirectusMedicine[];

  const errors: ImportError[] = [];
  let imported = 0;

  const BATCH = 25;
  for (let i = 0; i < items.length; i += BATCH) {
    const slice = items.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map(async (m) => {
        const directusId = Number(m.id);

        if (!m.name) {
          return {
            ok: false as const,
            directusId,
            message: "Missing required field (name).",
          };
        }
        const medicineType = mapMedicineType(m.medicine_type);
        if (!medicineType) {
          return {
            ok: false as const,
            directusId,
            message: `Unknown medicine_type: "${m.medicine_type ?? ""}".`,
          };
        }

        const row: MedicineInsert = {
          directus_id: directusId,
          name: m.name,
          medicine_type: medicineType,
          background_color: m.backgroundColor ?? null,
          text_color: m.textColor ?? null,
        };

        const { error } = await supabase
          .from("medicine")
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
