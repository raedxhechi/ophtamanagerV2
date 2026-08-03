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

type OfficeInsert = Database["public"]["Tables"]["doctor_office"]["Insert"];

/** Directus doctorOffice fields we read. Its id is a uuid, kept as the PK. */
interface DirectusOffice {
  id: string;
  name?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  zipCode?: string | null;
  city?: string | null;
}

const DIRECTUS_FIELDS = [
  "id",
  "name",
  "email",
  "phoneNumber",
  "street",
  "houseNumber",
  "zipCode",
  "city",
];

export async function getDoctorOfficeCounts(): Promise<SyncCounts> {
  const directus = createDirectusServerClient();
  const agg = (await directus.request(
    aggregate("doctorOffice", { aggregate: { count: "*" } })
  )) as Array<{ count: string | number | null }>;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("doctor_office")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);

  return { directus: Number(agg?.[0]?.count ?? 0), supabase: count ?? 0 };
}

/**
 * Copy all doctor offices from Directus into Supabase, preserving the uuid id
 * (so patient/order foreign keys line up). Idempotent: upserts on id.
 */
export async function importDoctorOffices(): Promise<ImportResult> {
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
    readItems("doctorOffice", { limit: -1, fields: DIRECTUS_FIELDS })
  )) as DirectusOffice[];

  const errors: ImportError[] = [];
  let imported = 0;

  const BATCH = 25;
  for (let i = 0; i < items.length; i += BATCH) {
    const slice = items.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map(async (o) => {
        if (!o.id) {
          return { ok: false as const, directusId: "-", message: "Missing office id." };
        }
        if (!o.name) {
          return {
            ok: false as const,
            directusId: o.id,
            message: "Missing required field (name).",
          };
        }

        const row: OfficeInsert = {
          id: o.id,
          name: o.name,
          email: o.email ?? null,
          phone_number: o.phoneNumber ?? null,
          street: o.street ?? null,
          house_number: o.houseNumber ?? null,
          zipcode: o.zipCode ?? null,
          city: o.city ?? null,
        };

        const { error } = await supabase
          .from("doctor_office")
          .upsert(row, { onConflict: "id" });
        if (error) {
          return { ok: false as const, directusId: o.id, message: error.message };
        }
        return { ok: true as const, directusId: o.id };
      })
    );

    for (const r of results) {
      if (r.ok) imported++;
      else errors.push({ directusId: r.directusId, message: r.message });
    }
  }

  return { total: items.length, imported, failed: errors.length, errors };
}
