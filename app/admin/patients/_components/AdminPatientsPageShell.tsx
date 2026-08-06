import { AdminTableSkeleton } from "../../_components/AdminTableSkeleton";

/**
 * The page chrome around the admin patients table. Shared by the page and by the
 * placeholder that stands in for it, so the heading paints immediately on
 * navigation and the table drops into a frame already reserved for it.
 */
export function AdminPatientsPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Every office&apos;s patients. Open a row to see the full record and its
          suborders, and to edit it.
        </p>
      </div>
      {children}
    </div>
  );
}

/**
 * Stand-in while the first page of patients is still being fetched. The column
 * count is the default visible set; a user with saved settings may see a
 * different number, which only shifts how the placeholder bars divide up.
 */
export function AdminPatientsFallback() {
  return <AdminTableSkeleton columnCount={8} />;
}
