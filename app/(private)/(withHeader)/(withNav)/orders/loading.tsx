import {
  OrdersPageShell,
  OrdersTableFallback,
} from "./_components/OrdersPageShell";

/**
 * Shown the moment the user navigates to /orders, while the page's query runs.
 * Without this boundary the router keeps the previous page on screen until the
 * whole server render resolves, which reads as the app freezing.
 */
export default function Loading() {
  return (
    <OrdersPageShell>
      <OrdersTableFallback />
    </OrdersPageShell>
  );
}
