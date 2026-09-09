"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/supabase/server";

export type SavePolicyState =
  | { error: string }
  | {
      success: true;
      /** The policy that was written — its new id on a create. */
      id: string;
      created: boolean;
    }
  | null;

/** Shape check on the ids coming out of the form, before they reach a filter. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * "Admins have full access to insurance policies" and the two
 * "Admins can manage policy-… links" policies are the whole authorisation
 * story here (20260731000558_create_insurance_policy.sql). This is what turns
 * their "no rows matched" into a sentence.
 */
async function requireAdmin(
  supabase: SupabaseClient,
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

/** The unique, well-formed ids submitted under `key`, in the form's own order. */
function ids(formData: FormData, key: string): string[] {
  return [
    ...new Set(
      formData
        .getAll(key)
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => UUID.test(value))
    ),
  ];
}

/** What the form describes: the office it belongs to, and what it covers. */
type PolicyInput = {
  doctorOfficeId: string;
  medicineIds: string[];
  companyIds: string[];
};

/**
 * `insurance_policy.doctor_office_id` is nullable in the schema — a policy can
 * be created and attached later — but this screen only ever creates policies
 * *for* an office, and a policy with none is invisible to the office users the
 * coverage rules are for. So the form requires one.
 */
function parsePolicy(formData: FormData): { error: string } | PolicyInput {
  const officeId = formData.get("doctor_office_id");
  const doctorOfficeId = typeof officeId === "string" ? officeId.trim() : "";

  if (!doctorOfficeId || !UUID.test(doctorOfficeId)) {
    return { error: "Pick the doctor office this policy belongs to." };
  }

  return {
    doctorOfficeId,
    medicineIds: ids(formData, "medicine_ids"),
    companyIds: ids(formData, "insurance_company_ids"),
  };
}

/**
 * Write the junction rows for a policy so they match `medicineIds` /
 * `companyIds`.
 *
 * A diff rather than delete-then-reinsert: the junctions are the policy's whole
 * content, and rewriting every row on every save would mean a moment where a
 * concurrent reader sees a policy that covers nothing. Rows that are already
 * right are left alone.
 */
async function syncLinks(
  supabase: SupabaseClient,
  policyId: string,
  input: PolicyInput
): Promise<string | null> {
  const [medicineResult, companyResult] = await Promise.all([
    supabase
      .from("insurance_policy_medicines")
      .select("medicine_id")
      .eq("insurance_policy_id", policyId),
    supabase
      .from("insurance_policy_insurance_companies")
      .select("insurance_company_id")
      .eq("insurance_policy_id", policyId),
  ]);

  if (medicineResult.error) return medicineResult.error.message;
  if (companyResult.error) return companyResult.error.message;

  const heldMedicines = new Set(
    (medicineResult.data ?? []).map((row) => row.medicine_id)
  );
  const heldCompanies = new Set(
    (companyResult.data ?? []).map((row) => row.insurance_company_id)
  );

  const wantedMedicines = new Set(input.medicineIds);
  const wantedCompanies = new Set(input.companyIds);

  const addMedicines = input.medicineIds.filter((id) => !heldMedicines.has(id));
  const dropMedicines = [...heldMedicines].filter((id) => !wantedMedicines.has(id));
  const addCompanies = input.companyIds.filter((id) => !heldCompanies.has(id));
  const dropCompanies = [...heldCompanies].filter((id) => !wantedCompanies.has(id));

  if (addMedicines.length) {
    const { error } = await supabase.from("insurance_policy_medicines").insert(
      addMedicines.map((medicineId) => ({
        insurance_policy_id: policyId,
        medicine_id: medicineId,
      }))
    );
    if (error) return error.message;
  }

  if (dropMedicines.length) {
    const { error } = await supabase
      .from("insurance_policy_medicines")
      .delete()
      .eq("insurance_policy_id", policyId)
      .in("medicine_id", dropMedicines);
    if (error) return error.message;
  }

  if (addCompanies.length) {
    const { error } = await supabase
      .from("insurance_policy_insurance_companies")
      .insert(
        addCompanies.map((companyId) => ({
          insurance_policy_id: policyId,
          insurance_company_id: companyId,
        }))
      );
    if (error) return error.message;
  }

  if (dropCompanies.length) {
    const { error } = await supabase
      .from("insurance_policy_insurance_companies")
      .delete()
      .eq("insurance_policy_id", policyId)
      .in("insurance_company_id", dropCompanies);
    if (error) return error.message;
  }

  return null;
}

/** Both list and detail read the links, so both go stale on any save. */
function revalidatePolicy(id: string | null) {
  revalidatePath("/admin/policies");
  if (id) {
    revalidatePath(`/admin/policies/${id}`);
    revalidatePath(`/admin/policies/${id}/edit`);
  }
}

/**
 * Create an insurance policy: the row first, then the medicines and companies
 * it covers, which need its id.
 *
 * A policy whose junctions failed is an empty policy rather than no policy —
 * it is reported as an error and left behind for the edit page to finish,
 * rather than deleted: deleting on a partial failure would throw away the half
 * that did land, and an empty policy covers nothing, so it cannot widen anyone's
 * coverage while it waits.
 */
export async function createInsurancePolicy(
  _prev: SavePolicyState,
  formData: FormData
): Promise<SavePolicyState> {
  const supabase = await createClient();
  const denied = await requireAdmin(supabase, "create insurance policies");
  if (denied) return denied;

  const input = parsePolicy(formData);
  if ("error" in input) return input;

  const { data: created, error } = await supabase
    .from("insurance_policy")
    .insert({ doctor_office_id: input.doctorOfficeId })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const linkError = await syncLinks(supabase, created.id, input);
  revalidatePolicy(created.id);

  if (linkError) {
    return {
      error: `The policy was created, but what it covers could not be saved (${linkError}). Open it and try again.`,
    };
  }

  return { success: true, id: created.id, created: true };
}

/** Save an existing policy: its office, and the two sets it links. */
export async function updateInsurancePolicy(
  _prev: SavePolicyState,
  formData: FormData
): Promise<SavePolicyState> {
  const supabase = await createClient();
  const denied = await requireAdmin(supabase, "edit insurance policies");
  if (denied) return denied;

  const id = formData.get("id");
  if (typeof id !== "string" || !UUID.test(id)) {
    return { error: "That insurance policy could not be identified." };
  }

  const input = parsePolicy(formData);
  if ("error" in input) return input;

  // Read the row back: an update refused by RLS matches no rows and reports no
  // error, which is indistinguishable from a save that changed nothing.
  const { data: saved, error } = await supabase
    .from("insurance_policy")
    .update({
      doctor_office_id: input.doctorOfficeId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!saved) {
    return {
      error:
        "That insurance policy could not be saved. It may have been removed.",
    };
  }

  const linkError = await syncLinks(supabase, id, input);
  revalidatePolicy(id);

  if (linkError) return { error: linkError };

  return { success: true, id, created: false };
}
