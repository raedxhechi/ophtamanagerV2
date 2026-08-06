import { AdminTableSkeleton } from "../../_components/AdminTableSkeleton";

/**
 * The page chrome around the admin orders table. Shared by the page and by the
 * placeholder that stands in for it, so the heading paints immediately on
 * navigation and the table drops into a frame already reserved for it.
 */
export function AdminOrdersPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every office&apos;s orders. Open a row to edit the order and its
          suborders.
        </p>
      </div>
      {children}
    </div>
  );
}

/**
 * Stand-in while the first page of orders is still being fetched. The column
 * count is the default visible set; a user with saved settings may see a
 * different number, which only shifts how the placeholder bars divide up.
 */
export function AdminOrdersFallback() {
  return <AdminTableSkeleton columnCount={7} />;
}
