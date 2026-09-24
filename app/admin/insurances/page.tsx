import { Suspense } from "react";

import { AdminInsuranceCompaniesData } from "./_components/AdminInsuranceCompaniesData";
import {
  AdminInsuranceCompaniesFallback,
  AdminInsurancesPageShell,
} from "./_components/AdminInsurancesPageShell";

export const metadata = { title: "Insurances" };

export default function AdminInsurancesPage() {
  return (
    <AdminInsurancesPageShell
      active="companies"
      description="The insurance companies the practices bill — private and public. Open a row to edit its name, type or IK number."
    >
      <Suspense fallback={<AdminInsuranceCompaniesFallback />}>
        <AdminInsuranceCompaniesData />
      </Suspense>
    </AdminInsurancesPageShell>
  );
}
