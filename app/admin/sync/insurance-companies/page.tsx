import { SyncPanel } from "../_components/SyncPanel";
import type { SyncCounts } from "../types";
import {
  getInsuranceCompanyCounts,
  importInsuranceCompanies,
} from "./actions";

export default async function SyncInsuranceCompaniesPage() {
  let counts: SyncCounts | null = null;
  let error: string | null = null;

  try {
    counts = await getInsuranceCompanyCounts();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load counts.";
  }

  return (
    <SyncPanel
      entityLabel="insurance companies"
      initialCounts={counts}
      initialError={error}
      getCounts={getInsuranceCompanyCounts}
      runImport={importInsuranceCompanies}
    />
  );
}
