"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { mirrorPatientToDirectus } from "@/directus/mirror";
import { createClient } from "@/supabase/server";
import type { Database } from "@/types/supabase";

type Gender = Database["public"]["Enums"]["gender"];

export type UpdatePatientState = { error: string } | { success: true } | null;
export type CreatePatientState = { error: string } | { success: true } | null;

/** Trim a FormData string field, returning null when empty. */
function field(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? null : trimmed;
}

/** The fields both create and update read, once the required ones are known good. */
function patientColumns(formData: FormData) {
  return {
    gender: (field(formData, "gender") as Gender | null) ?? null,
    insurance_number: field(formData, "insurance_number"),
    insurance_company_id: field(formData, "insurance_company_id"),
    status: field(formData, "status"),
    city: field(formData, "city"),
    street: field(formData, "street"),
    house_number: field(formData, "house_number"),
    zipcode: field(formData, "zipcode"),
  };
}

/**
 * Create a patient in any office, from the admin list.
 *
 * The office-facing action derives `doctor_office_id` from the signed-in user;
 * an admin has no office of their own, so the drawer asks for one and it is
 * required here.
 */
export async function createPatientAsAdmin(
  _prev: CreatePatientState,
  formData: FormData
): Promise<CreatePatientState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { error: "You need an admin account to add patients here." };
  }

  const doctor_office_id = field(formData, "doctor_office_id");
  if (!doctor_office_id) {
    return { error: "Pick the doctor office this patient belongs to." };
  }

  const first_name = field(formData, "first_name");
  const last_name = field(formData, "last_name");
  const date_of_birth = field(formData, "date_of_birth");

  if (!first_name || !last_name || !date_of_birth) {
    return { error: "First name, last name and date of birth are required." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
    return { error: "Invalid date of birth." };
  }

  // Required so the patient can be mirrored into Directus, where
  // insuranceCompany is NOT NULL. The form marks it required too; this is the
  // half that a submission bypassing the browser cannot skip.
  if (!field(formData, "insurance_company_id")) {
    return { error: "An insurance company is required." };
  }

  const { data: patient, error } = await supabase
    .from("patients")
    .insert({
      doctor_office_id,
      first_name,
      last_name,
      date_of_birth,
      ...patientColumns(formData),
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Copy the patient into the legacy Directus backend, now that it has an id.
  // It never throws: a Directus failure is logged server-side and the patient
  // is reported as created regardless, which it is.
  await mirrorPatientToDirectus(supabase, patient.id);

  revalidatePath("/admin/patients");
  return { success: true };
}

/**
 * Update any patient, from the admin list. The office-scoped action in
 * `app/(private)/.../patients/new/actions.ts` can only reach the caller's own
 * office; this one relies on the admin RLS policy to reach every office, and
 * the explicit is_admin check is what turns "no rows matched" into a message.
 *
 * `doctor_office_id` is deliberately not writable here: moving a patient
 * between offices would strand the suborders that hang off orders belonging to
 * the old office, so it stays a read-only field in the drawer.
 */
export async function updatePatientAsAdmin(
  _prev: UpdatePatientState,
  formData: FormData
): Promise<UpdatePatientState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { error: "You need an admin account to edit patients here." };
  }

  const id = field(formData, "id");
  if (!id) {
    return { error: "Missing patient id." };
  }

  const first_name = field(formData, "first_name");
  const last_name = field(formData, "last_name");
  const date_of_birth = field(formData, "date_of_birth");

  if (!first_name || !last_name || !date_of_birth) {
    return { error: "First name, last name and date of birth are required." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
    return { error: "Invalid date of birth." };
  }

  // Every patient keeps an insurance company — see the create action above.
  if (!field(formData, "insurance_company_id")) {
    return { error: "An insurance company is required." };
  }

  const { error } = await supabase
    .from("patients")
    .update({
      first_name,
      last_name,
      date_of_birth,
      ...patientColumns(formData),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/patients");
  return { success: true };
}

export type DeletePatientState =
  | { error: string }
  | { success: true; subOrders: number; draftSubOrders: number }
  | null;

/**
 * Delete a patient and every suborder that names them.
 *
 * Both FKs into `patients` are `on delete restrict` like every other one here,
 * so the cascade is done in this action rather than by the database: the
 * suborders and draft suborders go first, and only then the patient. An
 * accidental delete from anywhere else stays blocked by the constraint, and if
 * the children can't be removed the restrict refuses the last statement — the
 * patient survives instead of their suborders being orphaned. There is no
 * transaction (PostgREST has none), so this is the order that cannot leave
 * dangling rows behind.
 *
 * The orders those suborders belonged to are left alone: an order can name
 * several patients, and one of them leaving is not a reason to delete it. An
 * order whose only suborder was this patient's is left with none, and is
 * deleted from the admin orders drawer if it is no longer wanted.
 *
 * Directus is not touched. `directus/mirror.ts` only ever writes, so the
 * mirrored patient stays in the legacy backend until it is removed there.
 */
export async function deletePatientAsAdmin(
  _prev: DeletePatientState,
  formData: FormData
): Promise<DeletePatientState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { error: "You need an admin account to delete patients." };
  }

  const id = field(formData, "id");
  if (!id) {
    return { error: "Missing patient id." };
  }

  const { data: deletedSubOrders, error: subOrderError } = await supabase
    .from("suborders")
    .delete()
    .eq("patient_id", id)
    .select("id");

  if (subOrderError) {
    return { error: subOrderError.message };
  }

  // Parked drafts reference the patient too, and that FK would refuse the
  // delete below just as loudly as a real suborder's.
  const { data: deletedDraftSubOrders, error: draftError } = await supabase
    .from("draft_suborders")
    .delete()
    .eq("patient_id", id)
    .select("id");

  if (draftError) {
    return { error: draftError.message };
  }

  const { data: deletedPatients, error } = await supabase
    .from("patients")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return { error: error.message };
  }

  // RLS turns "not allowed" into "no rows matched", and the deletes above
  // report nothing in that case either — so an empty result here is the only
  // sign that the patient was never deleted.
  if (!deletedPatients || deletedPatients.length === 0) {
    return { error: "That patient no longer exists, or you can't delete it." };
  }

  revalidatePath("/admin/patients");
  return {
    success: true,
    subOrders: deletedSubOrders?.length ?? 0,
    draftSubOrders: deletedDraftSubOrders?.length ?? 0,
  };
}
