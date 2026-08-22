import { Suspense } from "react";

import { AdminUsersData } from "./_components/AdminUsersData";
import {
  AdminUsersFallback,
  AdminUsersPageShell,
} from "./_components/AdminUsersPageShell";

export const metadata = { title: "Users" };

export default function AdminUsersPage() {
  return (
    <AdminUsersPageShell>
      <Suspense fallback={<AdminUsersFallback />}>
        <AdminUsersData />
      </Suspense>
    </AdminUsersPageShell>
  );
}
