import { AdminTableSkeleton } from "../../_components/AdminTableSkeleton";

/**
 * The page chrome around the doctor-offices table. Shared by the page and by the
 * placeholder that stands in for it, so the heading paints immediately on
 * navigation and the table drops into a frame already reserved for it.
 */
export function AdminDoctorOfficesPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Doctor offices</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          The practices this pharmacy fills orders for — how to reach each one,
          and who works in it. Open a row to edit it, or add a new office and
          invite its doctors in the same step.
        </p>
      </div>
      {children}
    </div>
  );
}

export function AdminDoctorOfficesFallback() {
  return <AdminTableSkeleton columnCount={6} rowCount={6} />;
}
