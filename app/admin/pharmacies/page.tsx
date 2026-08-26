import { Suspense } from "react";

import { AdminPharmaciesData } from "./_components/AdminPharmaciesData";
import {
  AdminPharmaciesFallback,
  AdminPharmaciesPageShell,
} from "./_components/AdminPharmaciesPageShell";

export const metadata = { title: "Pharmacies" };

export default function AdminPharmaciesPage() {
  return (
    <AdminPharmaciesPageShell>
      <Suspense fallback={<AdminPharmaciesFallback />}>
        <AdminPharmaciesData />
      </Suspense>
    </AdminPharmaciesPageShell>
  );
}
