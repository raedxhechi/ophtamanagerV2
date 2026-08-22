import { createAdminClient } from "@/supabase/admin";
import { createClient } from "@/supabase/server";
import type { UserRole } from "@/types/user";

import type { OfficeOption } from "../../_components/OfficeFilter";
import { AdminUsersTable } from "./AdminUsersTable";

/**
 * How many accounts are listed. `listUsers` caps a page at 1000, and this app
 * has a few dozen users — if it ever outgrows that, this is the number that
 * has to turn into real pagination.
 */
const PER_PAGE = 1000;

/** Where an account stands, derived from what auth knows about it. */
export type UserStatus = "active" | "invited" | "pending";

export type AdminUserRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  /** null when the account has no user_data row yet. */
  role: UserRole | null;
  doctor_office: { id: string; name: string | null } | null;
  status: UserStatus;
  created_at: string | null;
  last_sign_in_at: string | null;
  /**
   * False for an account that exists in auth but has no profile — it can sign
   * in and will see nothing, so the table calls it out and the drawer fixes it.
   */
  has_profile: boolean;
};

/**
 * The suspending half of the admin users page.
 *
 * Two sources, joined on the user id. auth.users is the account list — who
 * exists, who has signed in, who is still sitting on an invitation — and it can
 * only be read with the service role. public.user_data is the app's own record
 * of what those accounts may do, read through the admin's session so RLS
 * applies. Listing auth first is deliberate: an account whose profile was never
 * created is exactly the one an admin needs to see.
 */
export async function AdminUsersData() {
  const supabase = await createClient();

  // RLS would already narrow user_data to the admin's own row rather than
  // erroring, which reads as "there is one user". Ask plainly instead.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return (
      <p className="text-muted-foreground text-sm">
        You need an admin account to manage users.
      </p>
    );
  }

  const [officesResult, profilesResult, authResult] = await Promise.all([
    supabase.from("doctor_office").select("id, name").order("name"),
    supabase
      .from("user_data")
      .select("*, doctor_office:doctor_office_id(id, name)"),
    createAdminClient().auth.admin.listUsers({ page: 1, perPage: PER_PAGE }),
  ]);

  if (authResult.error) {
    return (
      <p className="text-destructive text-sm">
        Failed to load accounts: {authResult.error.message}
      </p>
    );
  }

  if (profilesResult.error) {
    return (
      <p className="text-destructive text-sm">
        Failed to load profiles: {profilesResult.error.message}
      </p>
    );
  }

  const offices = (officesResult.data ?? []) as OfficeOption[];
  const profiles = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile])
  );

  const rows: AdminUserRow[] = authResult.data.users.map((user) => {
    const profile = profiles.get(user.id);

    return {
      id: user.id,
      // auth is the authority on the address people sign in with; the copy on
      // user_data is a mirror kept for joins.
      email: user.email ?? profile?.email ?? null,
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      role: profile?.role ?? null,
      doctor_office: profile?.doctor_office ?? null,
      status: user.last_sign_in_at
        ? "active"
        : user.invited_at
          ? "invited"
          : "pending",
      created_at: user.created_at ?? null,
      last_sign_in_at: user.last_sign_in_at ?? null,
      has_profile: profile !== undefined,
    };
  });

  // Newest first, so someone invited a minute ago is at the top.
  rows.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

  return <AdminUsersTable data={rows} offices={offices} />;
}
