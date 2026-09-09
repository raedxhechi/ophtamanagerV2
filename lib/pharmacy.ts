import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

import { addressLine } from "./address";

/** A row from the public.pharmacies table. */
export type Pharmacy = Database["public"]["Tables"]["pharmacies"]["Row"];

type Client = SupabaseClient<Database>;

/**
 * The pharmacy to show for an office: the one it is attached to, falling back to
 * the default pharmacy when it has none.
 *
 * The fallback is what covers the two cases the office link cannot answer — an
 * admin or manager who has not picked an office yet, and an office created
 * before the trigger in 20260826150000_doctor_office_joins_default_pharmacy.sql
 * started assigning them. Every office has one today, so the common path is a
 * single request; the fallback only costs a second one when the first finds
 * nothing.
 *
 * Reading a pharmacy needs no admin: "Authenticated users can view pharmacies"
 * returns every row to anyone signed in, which is what lets the private header
 * name it at all.
 */
export async function getPharmacyForOffice(
  supabase: Client,
  pharmacyId: string | null | undefined
): Promise<Pharmacy | null> {
  if (pharmacyId) {
    const { data } = await supabase
      .from("pharmacies")
      .select("*")
      .eq("id", pharmacyId)
      .maybeSingle();

    if (data) return data;
  }

  const { data } = await supabase
    .from("pharmacies")
    .select("*")
    .eq("default_pharmacy", true)
    .maybeSingle();

  return data ?? null;
}

/**
 * "Alexianerplatz 1a, 41464 Neuss" — as much of it as the row actually has.
 *
 * The formatting itself is `lib/address`: doctor offices carry the same four
 * nullable columns and print them the same way. This name is kept because it is
 * what the pharmacy screens call it, and it says which address is meant.
 */
export const pharmacyAddressLine = addressLine;
