import { SyncPanel } from "../_components/SyncPanel";
import type { SyncCounts } from "../types";
import { getPatientCounts, importPatients } from "./actions";

export default async function SyncPatientsPage() {
  let counts: SyncCounts | null = null;
  let error: string | null = null;

  try {
    counts = await getPatientCounts();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load counts.";
  }

  return (
    <SyncPanel
      entityLabel="patients"
      initialCounts={counts}
      initialError={error}
      getCounts={getPatientCounts}
      runImport={importPatients}
    />
  );
}
