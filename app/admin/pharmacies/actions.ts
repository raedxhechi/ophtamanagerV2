"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/supabase/server";

export type UpdatePharmacyState = { error: string } | { success: true } | null;

/** Trim a FormData string field, returning null when empty. */
function field(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? null : trimmed;
}

/** Shape check on the ids coming out of the form, before they reach a filter. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The same loose check the invite form uses — a typo, not a spec. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Update a pharmacy from the admin drawer.
 *
 * The only write this screen makes — nobody creates or deletes a pharmacy, and
 * the migration behind it grants no insert or delete to anyone. RLS says the
 * same thing about who may update ("Admins can update pharmacies"); the explicit
 * check here is what turns "no rows matched" into a sentence.
 *
 * The offices the drawer lists are not touched: `doctor_office.pharmacy_id` is
 * set when the office is created and nowhere else (see
 * 20260826150000_doctor_office_joins_default_pharmacy.sql), so the list is a
 * reading of that column rather than a form field, and a save cannot move an
 * office between pharmacies.
 */
export async function updatePharmacy(
  _prev: UpdatePharmacyState,
  formData: FormData
): Promise<UpdatePharmacyState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { error: "You need an admin account to edit pharmacies." };
  }

  const id = field(formData, "id");
  if (!id || !UUID.test(id)) {
    return { error: "That pharmacy could not be identified." };
  }

  const name = field(formData, "name");
  if (!name) {
    return { error: "A pharmacy needs a name." };
  }

  // Optional, but a mistyped one is worse than none: it is the address every
  // office is told to write to. The column takes any text — this is the form's
  // check, not the database's.
  const contact_email = field(formData, "contact_email");
  if (contact_email && !EMAIL.test(contact_email)) {
    return { error: "Enter a valid contact email, or leave it empty." };
  }

  // Whether this row is the default today. Read from the database rather than
  // taken from the form: the drawer shows the flag as a locked checkbox once it
  // is set, and a disabled checkbox submits nothing — trusting the form would
  // clear the project's only default every time the address was corrected.
  const { data: existing, error: readError } = await supabase
    .from("pharmacies")
    .select("default_pharmacy")
    .eq("id", id)
    .maybeSingle();

  if (readError) return { error: readError.message };
  if (!existing) return { error: "That pharmacy no longer exists." };

  // So the flag can only ever be turned on from here. Turning it on elsewhere is
  // what turns it off here — the trigger in
  // 20260826120000_add_pharmacy_contact_person_and_default.sql clears the others
  // in the same statement, which is the only way to move the default without
  // passing through a moment with none.
  const default_pharmacy =
    existing.default_pharmacy || formData.get("default_pharmacy") === "on";

  // Read the row back: an update refused by RLS matches no rows and reports no
  // error, which is indistinguishable from a save that changed nothing.
  const { data: saved, error } = await supabase
    .from("pharmacies")
    .update({
      name,
      contact_person: field(formData, "contact_person"),
      contact_email,
      phone_number: field(formData, "phone_number"),
      street: field(formData, "street"),
      house_number: field(formData, "house_number"),
      zipcode: field(formData, "zipcode"),
      city: field(formData, "city"),
      default_pharmacy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!saved) {
    return { error: "That pharmacy could not be saved. It may have been removed." };
  }

  revalidatePath("/admin/pharmacies");
  return { success: true };
}
