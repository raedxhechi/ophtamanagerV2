import { TableSkeleton } from "@/components/table/TableSkeleton";

/**
 * The page chrome around the orders table. Shared by the page and by every
 * placeholder that stands in for it, so the heading is painted immediately on
 * navigation and the table drops into the frame already reserved for it.
 */
export function OrdersPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[96rem] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      </div>
      {children}
    </div>
  );
}

/**
 * Stand-in for the table while its rows are still being fetched on the server.
 * The column count is the default visible set; a user with saved settings may
 * see a different number, which only shifts how the placeholder bars divide up.
 */
export function OrdersTableFallback() {
  return <TableSkeleton columnCount={5} headerClassName="bg-neutral-900" />;
}
