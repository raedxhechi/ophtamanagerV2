"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

  const { error } = await supabase.from("patients").insert({
    doctor_office_id,
    first_name,
    last_name,
    date_of_birth,
    ...patientColumns(formData),
  });

  if (error) {
    return { error: error.message };
  }

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
