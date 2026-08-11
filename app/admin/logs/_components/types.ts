import type { Database } from "@/types/supabase";

/** One selectable doctor office in the users panel's filter. */
export type OfficeOption = { id: string; name: string };

/** A user the log can be filtered to, with their office name joined in. */
export type LogUser = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: Database["public"]["Enums"]["user_role"];
  doctor_office_id: string | null;
  doctor_office: { name: string } | null;
};

/** "Dupont, Marie", falling back to the email and then the raw id. */
export function displayName(user: LogUser): string {
  const name = [user.last_name, user.first_name].filter(Boolean).join(", ");
  return name || user.email || user.id;
}
