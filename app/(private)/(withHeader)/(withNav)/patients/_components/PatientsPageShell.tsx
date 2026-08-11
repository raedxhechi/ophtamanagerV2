import { TableSkeleton } from "@/components/table/TableSkeleton";

/**
 * The page chrome around the patients table. Shared by the page and by every
 * placeholder that stands in for it, so the heading is painted immediately on
 * navigation and the table drops into the frame already reserved for it.
 */
export function PatientsPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[96rem] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
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
export function PatientsTableFallback() {
  return <TableSkeleton columnCount={7} headerClassName="bg-blue-600" />;
}
