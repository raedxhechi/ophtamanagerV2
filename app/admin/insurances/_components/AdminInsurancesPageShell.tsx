import { Skeleton } from "@/components/ui/skeleton";

import { AdminTableSkeleton } from "../../_components/AdminTableSkeleton";
import { CreateInsuranceCompanyDrawer } from "./CreateInsuranceCompanyDrawer";
import { InsurancesNav, type InsurancesView } from "./InsurancesNav";

/**
 * The page chrome both insurance screens share — one heading, one nav strip,
 * and a line of copy each page writes for itself. Shared so the heading and the
 * strip paint immediately on navigation and the content drops into a frame
 * already reserved for it.
 */
export function AdminInsurancesPageShell({
  active,
  description,
  children,
}: {
  active: InsurancesView;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Insurances</h1>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <InsurancesNav active={active} />
        {/* In the chrome rather than in either screen, so the same button is in
            reach from the list and from the overview and the two placements
            cannot drift apart. */}
        <CreateInsuranceCompanyDrawer />
      </div>
      {children}
    </div>
  );
}

export function AdminInsuranceCompaniesFallback() {
  return <AdminTableSkeleton columnCount={5} rowCount={8} />;
}

/** Three panels the height of the real ones, so the page doesn't jump. */
export function AdminInsurancesOverviewFallback() {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((column) => (
        <Skeleton key={column} className="h-[32rem] w-full rounded-xl" />
      ))}
    </div>
  );
}
