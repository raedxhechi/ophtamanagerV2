import { SyncAllPanel } from "./_components/SyncAllPanel";
import { getSyncOverview, type SyncOverview } from "./actions";

export default async function SyncOverviewPage() {
  let overview: SyncOverview | null = null;
  let error: string | null = null;

  try {
    overview = await getSyncOverview();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load counts.";
  }

  if (error) {
    return (
      <p className="text-destructive text-sm">Failed to load counts: {error}</p>
    );
  }

  if (!overview) return null;

  return <SyncAllPanel overview={overview} />;
}
