import { Suspense } from "react";

import { AdminInsurancesOverviewData } from "../_components/AdminInsurancesOverviewData";
import {
  AdminInsurancesOverviewFallback,
  AdminInsurancesPageShell,
} from "../_components/AdminInsurancesPageShell";

export const metadata = { title: "Insurances overview" };

export default function AdminInsurancesOverviewPage() {
  return (
    <AdminInsurancesPageShell
      active="overview"
      description="Follow an insurance company through the policies that name it: which doctor offices it reaches, and what those offices may dispense under it."
    >
      <Suspense fallback={<AdminInsurancesOverviewFallback />}>
        <AdminInsurancesOverviewData />
      </Suspense>
    </AdminInsurancesPageShell>
  );
}
