import { SyncPanel } from "../_components/SyncPanel";
import type { SyncCounts } from "../types";
import {
  getInsurancePolicyCounts,
  importInsurancePolicies,
} from "./actions";

export default async function SyncInsurancePoliciesPage() {
  let counts: SyncCounts | null = null;
  let error: string | null = null;

  try {
    counts = await getInsurancePolicyCounts();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load counts.";
  }

  return (
    <SyncPanel
      entityLabel="insurance policies"
      initialCounts={counts}
      initialError={error}
      getCounts={getInsurancePolicyCounts}
      runImport={importInsurancePolicies}
    />
  );
}
