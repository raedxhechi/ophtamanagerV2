import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

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
 * Every part is nullable and some of the migrated data carries stray whitespace
 * (the one zipcode in the table ends in a space), so this drops the empty pieces
 * rather than printing their separators. Structurally typed so the admin table's
 * row shape fits it as well as a plain pharmacy.
 */
export function pharmacyAddressLine(pharmacy: {
  street: string | null;
  house_number: string | null;
  zipcode: string | null;
  city: string | null;
}): string {
  const street = [pharmacy.street, pharmacy.house_number]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  const town = [pharmacy.zipcode, pharmacy.city]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return [street, town].filter(Boolean).join(", ");
}
