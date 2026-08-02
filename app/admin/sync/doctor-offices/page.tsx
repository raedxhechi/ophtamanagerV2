import { SyncPanel } from "../_components/SyncPanel";
import type { SyncCounts } from "../types";
import { getDoctorOfficeCounts, importDoctorOffices } from "./actions";

export default async function SyncDoctorOfficesPage() {
  let counts: SyncCounts | null = null;
  let error: string | null = null;

  try {
    counts = await getDoctorOfficeCounts();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load counts.";
  }

  return (
    <SyncPanel
      entityLabel="doctor offices"
      initialCounts={counts}
      initialError={error}
      getCounts={getDoctorOfficeCounts}
      runImport={importDoctorOffices}
    />
  );
}
