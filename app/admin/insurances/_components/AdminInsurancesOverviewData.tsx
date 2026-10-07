import { loadInsurancesOverview } from "../_data";
import { InsurancesOverview } from "./InsurancesOverview";

/** The suspending half of the overview. Same read, plus the medicine catalog. */
export async function AdminInsurancesOverviewData() {
  const result = await loadInsurancesOverview();

  if ("error" in result) {
    return <p className="text-destructive text-sm">{result.error}</p>;
  }

  return (
    <InsurancesOverview
      companies={result.companies}
      medicines={result.medicines}
    />
  );
}
