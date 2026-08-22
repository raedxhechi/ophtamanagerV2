import { AdminTableSkeleton } from "../../_components/AdminTableSkeleton";

/**
 * The page chrome around the admin users table. Shared by the page and by the
 * placeholder that stands in for it, so the heading paints immediately on
 * navigation and the table drops into a frame already reserved for it.
 */
export function AdminUsersPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Everyone with an account. Open a row to change a role or move someone
          to another office, or invite a new colleague — signing up isn&apos;t
          possible, an invitation is the only way in.
        </p>
      </div>
      {children}
    </div>
  );
}

export function AdminUsersFallback() {
  return <AdminTableSkeleton columnCount={6} />;
}
