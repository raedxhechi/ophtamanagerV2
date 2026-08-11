import { TableSkeleton } from "@/components/table/TableSkeleton";

/**
 * Shown the moment the user navigates to /draft-orders, while the page's query
 * runs. Without this boundary the router keeps the previous page on screen
 * until the whole server render resolves, which reads as the app freezing.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[96rem] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Draft orders</h1>
      </div>
      <TableSkeleton columnCount={7} headerClassName="bg-neutral-900" />
    </div>
  );
}
