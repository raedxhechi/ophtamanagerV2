import { createClient } from "@/supabase/server";
import type { Database } from "@/types/supabase";
import type { UserRole } from "@/types/user";

import { AdminDoctorOfficesTable } from "./AdminDoctorOfficesTable";

type DoctorOfficeRow = Database["public"]["Tables"]["doctor_office"]["Row"];

/**
 * A user as the office drawer needs them: their role, the office they create in
 * today, and every office they may reach.
 *
 * Both office fields are here because assigning someone is a different write
 * depending on the role — a move for most people, one more grant for a manager.
 * `activeOfficeName` is what the checkbox list shows beside a user who is
 * somewhere else, so ticking them reads as moving them rather than as a fresh
 * assignment. See ../actions.ts for the rule itself.
 */
export type OfficeUserOption = {
  id: string;
  name: string;
  email: string | null;
  role: UserRole;
  /** user_data.doctor_office_id — the active office. */
  activeOfficeId: string | null;
  activeOfficeName: string | null;
  /** public.user_office_access — every office they may work in. */
  officeIds: string[];
};

export type AdminDoctorOfficeRow = DoctorOfficeRow & {
  /** The pharmacy this office is served by, named for the table. */
  pharmacy_name: string | null;
  /** Everyone who works in this office, by name. */
  users: { id: string; name: string; role: UserRole }[];
};

/** "Meier, Anna" — falling back to whatever the row can offer. */
function displayName(profile: {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}): string {
  const name = [profile.last_name, profile.first_name].filter(Boolean).join(", ");
  return name || profile.email || "Unnamed user";
}

/**
 * The suspending half of the admin doctor-offices page.
 *
 * Four reads, joined here rather than in the select, because the office's user
 * list is two relations and only one of them hangs off the office: the active
 * office is a column on user_data, while the rest of a manager's offices live
 * in user_office_access. Grouping both onto the office here is what makes
 * "who works here" one list instead of two.
 */
export async function AdminDoctorOfficesData() {
  const supabase = await createClient();

  // RLS would narrow doctor_office to the offices the viewer belongs to rather
  // than erroring, which reads as "there is one office". Ask plainly instead —
  // the same reason /admin/users checks.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return (
      <p className="text-muted-foreground text-sm">
        You need an admin account to manage doctor offices.
      </p>
    );
  }

  const [officesResult, profilesResult, accessResult] = await Promise.all([
    supabase
      .from("doctor_office")
      .select("*, pharmacy:pharmacy_id(id, name)")
      .order("name"),
    supabase
      .from("user_data")
      .select("id, email, first_name, last_name, role, doctor_office_id")
      .order("last_name"),
    supabase.from("user_office_access").select("user_id, doctor_office_id"),
  ]);

  if (officesResult.error) {
    return (
      <p className="text-destructive text-sm">
        Failed to load doctor offices: {officesResult.error.message}
      </p>
    );
  }

  if (profilesResult.error) {
    return (
      <p className="text-destructive text-sm">
        Failed to load users: {profilesResult.error.message}
      </p>
    );
  }

  if (accessResult.error) {
    return (
      <p className="text-destructive text-sm">
        Failed to load office access: {accessResult.error.message}
      </p>
    );
  }

  const offices = officesResult.data ?? [];
  const officeNames = new Map(offices.map((office) => [office.id, office.name]));

  const accessByUser = new Map<string, string[]>();
  for (const grant of accessResult.data ?? []) {
    const held = accessByUser.get(grant.user_id);
    if (held) held.push(grant.doctor_office_id);
    else accessByUser.set(grant.user_id, [grant.doctor_office_id]);
  }

  const users: OfficeUserOption[] = (profilesResult.data ?? []).map((profile) => ({
    id: profile.id,
    name: displayName(profile),
    email: profile.email,
    role: profile.role,
    activeOfficeId: profile.doctor_office_id,
    activeOfficeName: profile.doctor_office_id
      ? (officeNames.get(profile.doctor_office_id) ?? null)
      : null,
    officeIds: accessByUser.get(profile.id) ?? [],
  }));

  users.sort((a, b) => a.name.localeCompare(b.name));

  const rows: AdminDoctorOfficeRow[] = offices.map(({ pharmacy, ...office }) => ({
    ...office,
    pharmacy_name: pharmacy?.name ?? null,
    // In the user list's own order (by name), which is the order the drawer's
    // checkboxes read them in.
    users: users
      .filter(
        (user) =>
          user.activeOfficeId === office.id || user.officeIds.includes(office.id)
      )
      .map(({ id, name, role }) => ({ id, name, role })),
  }));

  return <AdminDoctorOfficesTable data={rows} users={users} />;
}
