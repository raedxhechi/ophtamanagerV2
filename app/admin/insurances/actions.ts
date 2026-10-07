"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/supabase/server";
import { Constants, type Database } from "@/types/supabase";

export type UpdateInsuranceCompanyState =
  | { error: string }
  | { success: true }
  | null;

export type CreateInsuranceCompanyState =
  | { error: string }
  | { success: true; id: string; name: string }
  | null;

type InsuranceType = Database["public"]["Enums"]["insurance_type"];

/** Trim a FormData string field, returning null when empty. */
function field(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? null : trimmed;
}

/** Shape check on the id coming out of the form, before it reaches a filter. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The company's own columns, as both drawers submit them. */
type CompanyInput = {
  name: string;
  insurance_type: InsuranceType;
  iknumber: string | null;
};

/**
 * The three fields the row owns, shared by create and edit because the drawers
 * ask for the same things.
 *
 * The type is checked against the enum rather than trusted. The column would
 * refuse an unknown value anyway; this is what turns a Postgres type error into
 * the form's own wording.
 */
function parseCompany(formData: FormData): { error: string } | CompanyInput {
  const name = field(formData, "name");
  if (!name) {
    return { error: "An insurance company needs a name." };
  }

  const insuranceType = field(formData, "insurance_type");
  if (
    !insuranceType ||
    !(Constants.public.Enums.insurance_type as readonly string[]).includes(
      insuranceType
    )
  ) {
    return { error: "Pick whether this is a private or a public insurer." };
  }

  return {
    name,
    insurance_type: insuranceType as InsuranceType,
    iknumber: field(formData, "iknumber"),
  };
}

/**
 * Both writes are admin-only. "Admins can manage insurance companies" says the
 * same thing; the explicit check is what turns "no rows matched" into a
 * sentence rather than a silent no-op.
 */
async function requireAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  what: string
): Promise<{ error: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { error: `You need an admin account to ${what}.` };
  }

  return null;
}

/**
 * Update an insurance company from the admin drawer.
 *
 * Companies are not deleted from here, only created and edited: a company
 * cannot be dropped while a patient or a policy still points at it — both
 * foreign keys are ON DELETE RESTRICT, so a delete button would mostly be a
 * button that reports a constraint violation.
 *
 * "Admins can manage insurance companies" is the policy that authorises the
 * update; the explicit check here is what turns "no rows matched" into a
 * sentence rather than a silent no-op.
 */
export async function updateInsuranceCompany(
  _prev: UpdateInsuranceCompanyState,
  formData: FormData
): Promise<UpdateInsuranceCompanyState> {
  const supabase = await createClient();

  const denied = await requireAdmin(supabase, "edit insurance companies");
  if (denied) return denied;

  const id = field(formData, "id");
  if (!id || !UUID.test(id)) {
    return { error: "That insurance company could not be identified." };
  }

  const parsed = parseCompany(formData);
  if ("error" in parsed) return parsed;

  // Read the row back: an update refused by RLS matches no rows and reports no
  // error, which is indistinguishable from a save that changed nothing.
  const { data: saved, error } = await supabase
    .from("insurance_companies")
    .update({ ...parsed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!saved) {
    return {
      error:
        "That insurance company could not be saved. It may have been removed.",
    };
  }

  // "layout", so the overview at /admin/insurances/overview is refreshed too —
  // a renamed company or a flipped type shows on both screens, and only this
  // one has the drawer that changed it.
  revalidatePath("/admin/insurances", "layout");
  return { success: true };
}

/**
 * Create an insurance company from the "New insurance company" drawer.
 *
 * The catalog is also filled by the Directus import on
 * /admin/sync/insurance-companies, which is where the existing rows came from.
 * This is the way in for an insurer that arrives after that — a new private one,
 * or a fund the legacy system never held.
 *
 * It refuses a name that is already taken, case-insensitively. There is no
 * unique constraint behind that check, so it is a guard rather than a
 * guarantee: two admins racing can still land two rows. It is here because a
 * duplicate is close to permanent — no screen deletes an insurance company, and
 * once a patient or a policy points at one, the database will not either — and
 * because "Barmer" twice over is a choice nobody can make correctly on the
 * patient form afterwards.
 *
 * The new company deliberately reaches nothing yet. Which medicines it covers
 * and which offices it serves are a *policy's* business, so the drawer stays
 * open on success and points at /admin/policies rather than pretending the
 * company alone finished the job.
 */
export async function createInsuranceCompany(
  _prev: CreateInsuranceCompanyState,
  formData: FormData
): Promise<CreateInsuranceCompanyState> {
  const supabase = await createClient();

  const denied = await requireAdmin(supabase, "add insurance companies");
  if (denied) return denied;

  const parsed = parseCompany(formData);
  if ("error" in parsed) return parsed;

  const { data: clash, error: clashError } = await supabase
    .from("insurance_companies")
    .select("name")
    .ilike("name", parsed.name)
    .limit(1)
    .maybeSingle();

  if (clashError) return { error: clashError.message };
  if (clash) {
    return {
      error: `“${clash.name}” is already in the list. Open it to correct its details instead of adding a second one.`,
    };
  }

  // Read the row back for its id, and because an insert refused by RLS returns
  // no row rather than an error.
  const { data: created, error } = await supabase
    .from("insurance_companies")
    .insert(parsed)
    .select("id, name")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!created) {
    return { error: "That insurance company could not be created." };
  }

  // "layout", so the list and the overview both pick it up — the drawer stays
  // open afterwards, and the row should already be behind it.
  revalidatePath("/admin/insurances", "layout");
  return { success: true, id: created.id, name: created.name };
}
