import { AdminTableSkeleton } from "../../_components/AdminTableSkeleton";

/**
 * The page chrome around the pharmacies table. Shared by the page and by the
 * placeholder that stands in for it, so the heading paints immediately on
 * navigation and the table drops into a frame already reserved for it.
 */
export function AdminPharmaciesPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pharmacies</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          The pharmacy that fills the orders — its address, who to ask for there,
          and which doctor offices it serves. Open a row to edit it; pharmacies
          are not created or deleted from here.
        </p>
      </div>
      {children}
    </div>
  );
}

export function AdminPharmaciesFallback() {
  return <AdminTableSkeleton columnCount={5} rowCount={3} />;
}
