"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { mirrorPatientToDirectus } from "@/directus/mirror";
import { createClient } from "@/supabase/server";
import type { Database } from "@/types/supabase";

type Gender = Database["public"]["Enums"]["gender"];

export type CreatePatientState = { error: string } | null;

/** Trim a FormData string field, returning null when empty. */
function field(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? null : trimmed;
}

export async function createPatient(
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

  // The patient must be scoped to the current user's office (enforced by RLS).
  const { data: profile } = await supabase
    .from("user_data")
    .select("doctor_office_id")
    .eq("id", user.id)
    .single();

  const officeId = profile?.doctor_office_id;
  if (!officeId) {
    return { error: "You are not assigned to a doctor office." };
  }

  const first_name = field(formData, "first_name");
  const last_name = field(formData, "last_name");
  const date_of_birth = field(formData, "date_of_birth");

  if (!first_name || !last_name || !date_of_birth) {
    return {
      error: "First name, last name and date of birth are required.",
    };
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
      doctor_office_id: officeId,
      first_name,
      last_name,
      date_of_birth,
      gender: (field(formData, "gender") as Gender | null) ?? null,
      insurance_number: field(formData, "insurance_number"),
      insurance_company_id: field(formData, "insurance_company_id"),
      city: field(formData, "city"),
      street: field(formData, "street"),
      house_number: field(formData, "house_number"),
      zipcode: field(formData, "zipcode"),
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Copy the patient into the legacy Directus backend, now that it has an id.
  // Awaited rather than left running because the redirect below ends the
  // request; the mirror never throws, so a Directus failure only reaches the
  // server log and the patient stays created either way.
  await mirrorPatientToDirectus(supabase, patient.id);

  revalidatePath("/patients");
  redirect("/patients");
}

export type UpdatePatientState =
  | { error: string }
  | { success: true }
  | null;

export async function updatePatient(
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

  const id = field(formData, "id");
  if (!id) {
    return { error: "Missing patient id." };
  }

  const first_name = field(formData, "first_name");
  const last_name = field(formData, "last_name");
  const date_of_birth = field(formData, "date_of_birth");

  if (!first_name || !last_name || !date_of_birth) {
    return {
      error: "First name, last name and date of birth are required.",
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
    return { error: "Invalid date of birth." };
  }

  // Every patient keeps an insurance company — see the create action above.
  if (!field(formData, "insurance_company_id")) {
    return { error: "An insurance company is required." };
  }

  // The office scoping and row ownership are enforced by RLS; the update
  // simply targets the patient by id.
  const { error } = await supabase
    .from("patients")
    .update({
      first_name,
      last_name,
      date_of_birth,
      gender: (field(formData, "gender") as Gender | null) ?? null,
      insurance_number: field(formData, "insurance_number"),
      insurance_company_id: field(formData, "insurance_company_id"),
      city: field(formData, "city"),
      street: field(formData, "street"),
      house_number: field(formData, "house_number"),
      zipcode: field(formData, "zipcode"),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/patients");
  return { success: true };
}
