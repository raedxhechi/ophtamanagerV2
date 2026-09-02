import { createClient } from "@/supabase/server";

import type {
  CompanyItem,
  MedicineItem,
  OfficeOption,
  PolicySummary,
} from "./_components/types";

/** A policy row as the list and the "copy from" picker both read it. */
type RawPolicy = {
  id: string;
  doctor_office_id: string | null;
  created_at: string;
  insurance_policy_medicines: { medicine_id: string }[] | null;
  insurance_policy_insurance_companies: { insurance_company_id: string }[] | null;
};

/** Policies that belong to no office yet — the column is nullable. */
export const UNASSIGNED_OFFICE = "Without a doctor office";

/**
 * Every policy, numbered and labelled.
 *
 * The number is the office's own creation order, **oldest first**, so a policy
 * keeps the name it had yesterday: it is what the copy picker and the cards
 * call it, and numbering the newest one "Policy 1" would rename every policy in
 * an office each time one is added.
 */
export async function listPolicySummaries(): Promise<PolicySummary[]> {
  const supabase = await createClient();

  const [{ data: policyData }, { data: officeData }] = await Promise.all([
    supabase
      .from("insurance_policy")
      .select(
        `id, doctor_office_id, created_at,
         insurance_policy_medicines ( medicine_id ),
         insurance_policy_insurance_companies ( insurance_company_id )`
      )
      .order("created_at", { ascending: true }),
    supabase.from("doctor_office").select("id, name"),
  ]);

  const officeNames = new Map(
    (officeData ?? []).map((office) => [
      office.id,
      office.name ?? "Unnamed office",
    ])
  );

  const seen = new Map<string, number>();

  return ((policyData ?? []) as unknown as RawPolicy[]).map((policy) => {
    const key = policy.doctor_office_id ?? "";
    const index = (seen.get(key) ?? 0) + 1;
    seen.set(key, index);

    const officeName = policy.doctor_office_id
      ? (officeNames.get(policy.doctor_office_id) ?? "Unnamed office")
      : UNASSIGNED_OFFICE;

    return {
      id: policy.id,
      label: `Policy ${index}`,
      officeId: policy.doctor_office_id,
      officeName,
      medicineIds: (policy.insurance_policy_medicines ?? []).map(
        (link) => link.medicine_id
      ),
      companyIds: (policy.insurance_policy_insurance_companies ?? []).map(
        (link) => link.insurance_company_id
      ),
    };
  });
}

/** The three lists the create and edit forms are built out of. */
export async function loadPolicyFormOptions(): Promise<{
  offices: OfficeOption[];
  medicines: MedicineItem[];
  companies: CompanyItem[];
}> {
  const supabase = await createClient();

  const [offices, medicines, companies] = await Promise.all([
    supabase.from("doctor_office").select("id, name").order("name"),
    supabase
      .from("medicine")
      .select("id, name, medicine_type, background_color, text_color")
      .order("name"),
    supabase
      .from("insurance_companies")
      .select("id, name, insurance_type, iknumber")
      .order("name"),
  ]);

  return {
    offices: offices.data ?? [],
    medicines: (medicines.data ?? []) as MedicineItem[],
    companies: (companies.data ?? []) as CompanyItem[],
  };
}
