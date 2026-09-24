import { createClient } from "@/supabase/server";

import { listPolicySummaries, UNASSIGNED_OFFICE } from "../policies/_data";
import {
  UNASSIGNED_OFFICE_KEY,
  type AdminInsuranceCompanyRow,
  type MedicineItem,
  type OverviewOffice,
} from "./_components/types";

/**
 * Every insurance company, with the policies that name it folded in under the
 * office each belongs to.
 *
 * Nothing here is paged: the catalog is a few dozen companies and the policies
 * are counted in single figures, which is also why both screens filter in the
 * browser like /admin/users and /admin/pharmacies rather than through the URL.
 *
 * The policy side comes from `listPolicySummaries()` rather than a query of its
 * own. That function is what numbers a policy within its office, and a policy
 * has to be called the same thing here as it is on /admin/policies or the two
 * screens are talking about different things.
 */
export async function loadInsuranceCompanies(): Promise<
  { error: string } | { companies: AdminInsuranceCompanyRow[] }
> {
  const supabase = await createClient();

  const [companiesResult, policies] = await Promise.all([
    supabase
      .from("insurance_companies")
      .select("id, name, insurance_type, iknumber, created_at, updated_at")
      .order("name"),
    listPolicySummaries(),
  ]);

  if (companiesResult.error) {
    return {
      error: `Failed to load insurance companies: ${companiesResult.error.message}`,
    };
  }

  const companies: AdminInsuranceCompanyRow[] = (companiesResult.data ?? []).map(
    (company) => {
      const linked = policies.filter((policy) =>
        policy.companyIds.includes(company.id)
      );

      // Grouped by office, in the order the policies came back — oldest first
      // within an office, which is the order their numbers were handed out, so
      // "Policy 1" is never listed under "Policy 2".
      const byOffice = new Map<string, OverviewOffice>();
      for (const policy of linked) {
        const key = policy.officeId ?? UNASSIGNED_OFFICE_KEY;
        let office = byOffice.get(key);
        if (!office) {
          office = {
            key,
            name: policy.officeId ? policy.officeName : UNASSIGNED_OFFICE,
            policies: [],
          };
          byOffice.set(key, office);
        }
        office.policies.push({
          id: policy.id,
          label: policy.label,
          medicineIds: policy.medicineIds,
        });
      }

      const offices = [...byOffice.values()].sort((a, b) => {
        // The unassigned group last however it sorts by name — it is not an
        // office, and putting it in the alphabet would hide that.
        if (a.key === UNASSIGNED_OFFICE_KEY) return 1;
        if (b.key === UNASSIGNED_OFFICE_KEY) return -1;
        return a.name.localeCompare(b.name);
      });

      return {
        id: company.id,
        name: company.name,
        insurance_type: company.insurance_type,
        iknumber: company.iknumber,
        created_at: company.created_at,
        updated_at: company.updated_at,
        offices,
        policyCount: linked.length,
      };
    }
  );

  return { companies };
}

/**
 * The same companies, plus the medicine catalog the overview's third column
 * resolves policy links against. The catalog is fetched whole and filtered in
 * the browser: a policy carries medicine *ids*, and which of them are on screen
 * changes with every checkbox, so the alternative is a query per tick.
 */
export async function loadInsurancesOverview(): Promise<
  | { error: string }
  | { companies: AdminInsuranceCompanyRow[]; medicines: MedicineItem[] }
> {
  const supabase = await createClient();

  const [companies, medicinesResult] = await Promise.all([
    loadInsuranceCompanies(),
    supabase
      .from("medicine")
      .select("id, name, medicine_type, background_color, text_color")
      .order("name"),
  ]);

  if ("error" in companies) return companies;
  if (medicinesResult.error) {
    return {
      error: `Failed to load medicines: ${medicinesResult.error.message}`,
    };
  }

  return {
    companies: companies.companies,
    medicines: (medicinesResult.data ?? []) as MedicineItem[],
  };
}
