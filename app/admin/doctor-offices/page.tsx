import { Suspense } from "react";

import { AdminDoctorOfficesData } from "./_components/AdminDoctorOfficesData";
import {
  AdminDoctorOfficesFallback,
  AdminDoctorOfficesPageShell,
} from "./_components/AdminDoctorOfficesPageShell";

export const metadata = { title: "Doctor offices" };

export default function AdminDoctorOfficesPage() {
  return (
    <AdminDoctorOfficesPageShell>
      <Suspense fallback={<AdminDoctorOfficesFallback />}>
        <AdminDoctorOfficesData />
      </Suspense>
    </AdminDoctorOfficesPageShell>
  );
}
