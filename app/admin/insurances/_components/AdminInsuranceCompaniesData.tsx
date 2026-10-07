import { loadInsuranceCompanies } from "../_data";
import { AdminInsuranceCompaniesTable } from "./AdminInsuranceCompaniesTable";

/**
 * The suspending half of the insurance companies list.
 *
 * Every signed-in user may read the insurance catalog and (through their
 * office) the policies, so no admin check gates the read — proxy.ts is what
 * keeps non-admins out of /admin, and "Admins can manage insurance companies"
 * is what refuses a write from anyone else.
 */
export async function AdminInsuranceCompaniesData() {
  const result = await loadInsuranceCompanies();

  if ("error" in result) {
    return <p className="text-destructive text-sm">{result.error}</p>;
  }

  return <AdminInsuranceCompaniesTable data={result.companies} />;
}
