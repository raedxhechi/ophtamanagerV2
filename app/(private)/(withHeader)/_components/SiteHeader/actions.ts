"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/supabase/server";

export type SelectOfficeState = { error: string } | null;

/**
 * Remember which doctor office an admin or manager is working in.
 *
 * Stored on user_settings, so it survives the session — the next sign-in opens
 * on the office they left off in. It is a preference, not a grant: RLS still
 * scopes every read to `current_office_ids()`, so the worst a bad value can do
 * is show an empty list.
 */
export async function selectDoctorOffice(
  officeId: string
): Promise<SelectOfficeState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // RLS is the authorisation, and reading the row back is how it is asked:
  // doctor_office returns only offices this caller may reach — every one for an
  // admin, the access set for a manager. A row coming back is the permission;
  // nothing coming back is the refusal, and it needs no role check of its own.
  const { data: office } = await supabase
    .from("doctor_office")
    .select("id")
    .eq("id", officeId)
    .maybeSingle();

  if (!office) {
    return { error: "You don't have access to that doctor office." };
  }

  // Upsert because a user who has never touched a column selector has no
  // settings row yet; only the one column is written, so the table preferences
  // stored alongside it are left alone.
  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      selected_doctor_office: office.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { error: error.message };
  }

  // Every list in the private area is scoped to this office, not just the page
  // the switcher happens to be sitting on, so the whole subtree has to be
  // re-read — including the client-side router cache holding the pages they
  // were on a moment ago.
  revalidatePath("/", "layout");
  return null;
}
