import type { User } from "@supabase/supabase-js";

import type { Database } from "./supabase";

/** A row from the public.user_data table. */
export type UserData = Database["public"]["Tables"]["user_data"]["Row"];

/** A row from the public.doctor_office table. */
export type DoctorOffice = Database["public"]["Tables"]["doctor_office"]["Row"];

/** The user's role enum (admin | doctor | manager | assistant | pharmacist). */
export type UserRole = Database["public"]["Enums"]["user_role"];

/** A user_data row with its connected doctor office joined in. */
export type UserDataWithOffice = UserData & {
  doctor_office: DoctorOffice | null;
};

/**
 * An application user: the Supabase auth user combined with the fields from
 * that user's public.user_data row (role, office, timestamps, ...).
 */
export type AppUser = User & UserData;
