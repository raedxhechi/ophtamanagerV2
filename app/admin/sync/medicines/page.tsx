import { SyncPanel } from "../_components/SyncPanel";
import type { SyncCounts } from "../types";
import { getMedicineCounts, importMedicines } from "./actions";

export default async function SyncMedicinesPage() {
  let counts: SyncCounts | null = null;
  let error: string | null = null;

  try {
    counts = await getMedicineCounts();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load counts.";
  }

  return (
    <SyncPanel
      entityLabel="medicines"
      initialCounts={counts}
      initialError={error}
      getCounts={getMedicineCounts}
      runImport={importMedicines}
    />
  );
}
