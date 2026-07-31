"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

  const { error } = await supabase.from("patients").insert({
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
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/patients");
  redirect("/patients");
}
