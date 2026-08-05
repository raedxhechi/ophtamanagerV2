import { SyncPanel } from "../_components/SyncPanel";
import type { SyncCounts } from "../types";
import { clearAllOrders, getOrderCounts } from "./actions";

export default async function SyncOrdersPage() {
  let counts: SyncCounts | null = null;
  let error: string | null = null;

  try {
    counts = await getOrderCounts();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load counts.";
  }

  return (
    <SyncPanel
      entityLabel="orders"
      initialCounts={counts}
      initialError={error}
      getCounts={getOrderCounts}
      streamPath="/admin/sync/orders/stream"
      onClearAll={clearAllOrders}
    />
  );
}
