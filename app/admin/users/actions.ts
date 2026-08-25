"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/supabase/admin";
import { createClient } from "@/supabase/server";
import { Constants } from "@/types/supabase";
import type { UserRole } from "@/types/user";

import { NO_OFFICE } from "./_components/officeSelect";

export type InviteUserState =
  | { error: string }
  | { success: true; email: string }
  | null;
export type UpdateUserState = { error: string } | { success: true } | null;
export type DeleteUserState =
  | { error: string }
  | { success: true; kept: KeptRows }
  | null;

/** What the delete left behind, for the confirmation the admin gets back. */
export type KeptRows = { orders: number; draft_orders: number; system_logs: number };
export type ResendInviteState =
  | { error: string }
  | { success: true; email: string };

/** Trim a FormData string field, returning null when empty. */
function field(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? null : trimmed;
}

/**
 * Accept only a value the `user_role` enum actually has. Reading the list from
 * the generated types means a role added in a migration reaches this screen as
 * soon as the types are regenerated, and one that doesn't exist yet is refused
 * here rather than by a constraint violation.
 */
function parseRole(value: string | null): UserRole | null {
  const roles = Constants.public.Enums.user_role as readonly string[];
  return value && roles.includes(value) ? (value as UserRole) : null;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Both actions here write other people's roles, so both are admin-only. RLS
 * says the same thing (see 20260822120000_admin_manage_user_data.sql); this is
 * what turns "no rows matched" into a sentence the admin can act on.
 */
async function requireAdmin(
  supabase: SupabaseClient,
  what: string
): Promise<{ error: string } | { userId: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { error: `You need an admin account to ${what}.` };
  }

  return { userId: user.id };
}

/** What the form says this account may reach. */
type Assignment = {
  role: UserRole;
  /**
   * The ACTIVE office: user_data.doctor_office_id. The one office new patients
   * and orders are created in, and the one the app header shows.
   */
  doctor_office_id: string | null;
  /**
   * The ACCESS SET: every office the user may work in
   * (public.user_office_access). Only a manager submits one — for every other
   * role the set is exactly the active office, and the trigger in
   * 20260811120100_create_user_office_access.sql keeps it that way on its own,
   * so this stays null and syncOfficeAccess() does nothing.
   */
  office_ids: string[] | null;
};

/** Shape check on the ids coming out of the form, before they reach a filter. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate the fields that decide what a user can see, shared by invite and
 * edit because a half-provisioned account is the same problem either way.
 *
 * `currentOfficeId` is the active office the account already has — null for an
 * invitation. It only matters for a manager: the form hands over a set, not a
 * pointer into it, so the office they have been creating in is kept as long as
 * it is still in the set (see resolveActiveOffice below).
 */
function parseAssignment(
  formData: FormData,
  currentOfficeId: string | null
): { error: string } | Assignment {
  const role = parseRole(field(formData, "role"));
  if (!role) {
    return { error: "Pick a role for this user." };
  }

  // A manager works across several offices, so their office field is a set of
  // checkboxes rather than a select — repeated `doctor_office_ids` inputs, in
  // the order the picker listed them.
  if (role === "manager") {
    const office_ids = [
      ...new Set(
        formData
          .getAll("doctor_office_ids")
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter((value) => UUID.test(value))
      ),
    ];

    if (!office_ids.length) {
      return {
        error: "Pick at least one doctor office for this manager to work in.",
      };
    }

    return {
      role,
      doctor_office_id: resolveActiveOffice(office_ids, currentOfficeId),
      office_ids,
    };
  }

  // The office select carries a sentinel for "none" (Radix has no empty value).
  const selectedOffice = field(formData, "doctor_office_id");
  const doctor_office_id = selectedOffice === NO_OFFICE ? null : selectedOffice;

  // Admins work across every office and hold none of their own; for everybody
  // else the office *is* their access — RLS scopes patients, orders and drafts
  // to it, so a user without one opens the app to empty tables.
  if (role !== "admin" && !doctor_office_id) {
    return { error: "Pick the doctor office this user works in." };
  }

  // An admin may still be attached to an office; it just isn't required.
  return { role, doctor_office_id, office_ids: null };
}

/**
 * Which of a manager's offices stays the active one.
 *
 * Their current office, while it is still in the set — adding or removing
 * *other* offices must not silently move where their next order lands. Only
 * when the active office is the one being taken away does the marker move, and
 * then to the first of the set, which is the order the picker listed them in.
 * OfficeAccessField mirrors this rule to badge the right row.
 */
function resolveActiveOffice(
  officeIds: string[],
  currentOfficeId: string | null
): string {
  return currentOfficeId && officeIds.includes(currentOfficeId)
    ? currentOfficeId
    : officeIds[0];
}

/**
 * Bring public.user_office_access in line with the offices the form ticked.
 *
 * Runs *after* the user_data write, never before: that write fires
 * user_data_sync_office_access(), which for a non-manager deletes every row but
 * the active office — so rows inserted first would be thrown away, and a role
 * being demoted from manager collapses correctly with no help from here.
 *
 * For a manager the trigger only ever adds (it must not drop the rest of the
 * set when the active office moves), which is exactly why the revoking half has
 * to be done explicitly. Stale rows are read back rather than filtered out by
 * negation so the delete only ever names ids that came from the database.
 */
async function syncOfficeAccess(
  supabase: SupabaseClient,
  userId: string,
  officeIds: string[] | null
): Promise<{ error: string } | null> {
  if (!officeIds) return null;

  const { data: current, error: readError } = await supabase
    .from("user_office_access")
    .select("doctor_office_id")
    .eq("user_id", userId);

  if (readError) {
    return { error: readError.message };
  }

  const keep = new Set(officeIds);
  const stale = (current ?? [])
    .map((row) => row.doctor_office_id)
    .filter((id) => !keep.has(id));

  if (stale.length) {
    const { error } = await supabase
      .from("user_office_access")
      .delete()
      .eq("user_id", userId)
      .in("doctor_office_id", stale);

    if (error) {
      return { error: error.message };
    }
  }

  // ignoreDuplicates so re-saving an unchanged set is a no-op rather than a
  // rewrite: created_at says when the office was granted, not when the drawer
  // was last opened. The active office is already here, put there by the
  // trigger; listing it again costs nothing and keeps the set the single source.
  const { error } = await supabase.from("user_office_access").upsert(
    officeIds.map((doctor_office_id) => ({
      user_id: userId,
      doctor_office_id,
    })),
    { onConflict: "user_id,doctor_office_id", ignoreDuplicates: true }
  );

  return error ? { error: error.message } : null;
}

/**
 * Where an invitation should land if the template is ever reset to the stock
 * `{{ .ConfirmationURL }}` — ours builds its own link to /auth/confirm, so this
 * is only a fallback. Taken from the request so it follows whichever host the
 * admin is working on.
 */
async function inviteRedirectTo(): Promise<string | undefined> {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  return host
    ? `${proto}://${host}/auth/callback?next=/accept-invite`
    : undefined;
}

/**
 * Invite someone to the app: a Supabase auth invitation plus the user_data row
 * that gives the account a role and an office.
 *
 * Signups are disabled (see supabase/config.toml), so this is how people get
 * in. The invitation email is the one in supabase/templates/invite.html and
 * lands on /accept-invite, where they choose a password.
 */
export async function inviteUser(
  _prev: InviteUserState,
  formData: FormData
): Promise<InviteUserState> {
  const supabase = await createClient();
  const guard = await requireAdmin(supabase, "invite users");
  if ("error" in guard) return guard;

  const email = field(formData, "email")?.toLowerCase() ?? null;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  // No account yet, so no active office to preserve: a manager's first office
  // is whichever of the ticked ones comes first.
  const assignment = parseAssignment(formData, null);
  if ("error" in assignment) return assignment;

  const first_name = field(formData, "first_name");
  const last_name = field(formData, "last_name");

  const redirectTo = await inviteRedirectTo();

  // The one thing on this screen that cannot go through the caller's session:
  // sending an invitation is a service-role endpoint whoever asks for it.
  const { data, error } = await createAdminClient().auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo,
      // user_metadata — the site header greets people by these before their
      // user_data row is ever read.
      data: { first_name, last_name },
    }
  );

  if (error) {
    if (error.code === "email_exists") {
      return { error: `${email} already has an account.` };
    }
    return { error: error.message };
  }

  // The profile: role and office live here, not in auth. Written with the
  // admin's own session, so the RLS policy is what authorises it.
  const { error: profileError } = await supabase.from("user_data").insert({
    id: data.user.id,
    email,
    role: assignment.role,
    doctor_office_id: assignment.doctor_office_id,
    first_name,
    last_name,
  });

  if (profileError) {
    // The invitation is already out and the account exists; deleting it to tidy
    // up would be worse than saying so. The table lists accounts with no
    // profile, and opening one is how this gets finished.
    return {
      error: `${email} was invited, but their role could not be saved (${profileError.message}). Open their row in the table to finish setting it up.`,
    };
  }

  // A manager's remaining offices. The trigger has already granted the active
  // one, so a failure here leaves a working single-office manager rather than a
  // user who sees nothing — worth saying, not worth undoing the invitation for.
  const accessError = await syncOfficeAccess(
    supabase,
    data.user.id,
    assignment.office_ids
  );

  if (accessError) {
    revalidatePath("/admin/users");
    return {
      error: `${email} was invited, but only one of their offices could be saved (${accessError.error}). Open their row in the table to grant the rest.`,
    };
  }

  revalidatePath("/admin/users");
  return { success: true, email };
}

/**
 * Save a user's profile: role, office and name.
 *
 * An upsert rather than an update — an account created straight from the
 * Supabase dashboard has no user_data row at all, and this drawer is where it
 * gets one. Email is not writable here: it is the login identity, and changing
 * it means changing the auth user too.
 */
export async function updateUserProfile(
  _prev: UpdateUserState,
  formData: FormData
): Promise<UpdateUserState> {
  const supabase = await createClient();
  const guard = await requireAdmin(supabase, "edit users");
  if ("error" in guard) return guard;

  const id = field(formData, "id");
  if (!id) {
    return { error: "Missing user id." };
  }

  // The office the account creates in today. Read from the row rather than
  // carried in a hidden field: for a manager it is the one thing the form does
  // not say, and it decides where their next order lands. maybeSingle because
  // an account created from the Supabase dashboard has no row yet — this drawer
  // is where it gets one.
  const { data: existing } = await supabase
    .from("user_data")
    .select("doctor_office_id")
    .eq("id", id)
    .maybeSingle();

  const assignment = parseAssignment(formData, existing?.doctor_office_id ?? null);
  if ("error" in assignment) return assignment;

  // Dropping your own admin role closes this screen behind you, and the only
  // way back in is the Supabase dashboard.
  if (id === guard.userId && assignment.role !== "admin") {
    return { error: "You can't take the admin role away from your own account." };
  }

  const { error } = await supabase.from("user_data").upsert(
    {
      id,
      role: assignment.role,
      doctor_office_id: assignment.doctor_office_id,
      first_name: field(formData, "first_name"),
      last_name: field(formData, "last_name"),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    return { error: error.message };
  }

  const accessError = await syncOfficeAccess(supabase, id, assignment.office_ids);
  if (accessError) {
    // The role and the active office are saved; only the rest of the set is
    // not. Revalidate anyway so the table shows what did land.
    revalidatePath("/admin/users");
    return {
      error: `The role was saved, but the office list was not (${accessError.error}).`,
    };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

/**
 * Send the invitation again to an account that never accepted the first one.
 *
 * Invitation links expire (`otp_expiry` in supabase/config.toml governs all
 * emailed auth links, invitations included), and the account is left sitting in
 * auth with no password and no way in. Re-inviting mints a fresh token and
 * sends the same email; GoTrue allows it precisely because the address is not
 * confirmed yet, and refuses once it is — which is what the `email_exists`
 * branch below is about.
 *
 * A plain argument rather than a form action: the button lives inside the edit
 * drawer's form, and a form inside a form is not a thing.
 */
export async function resendInvite(userId: string): Promise<ResendInviteState> {
  const supabase = await createClient();
  const guard = await requireAdmin(supabase, "resend invitations");
  if ("error" in guard) return guard;

  // auth is the authority on the address and on whether the invitation was
  // ever taken up, and only the service role may ask it.
  const admin = createAdminClient();
  const { data: existing, error: lookupError } =
    await admin.auth.admin.getUserById(userId);

  if (lookupError || !existing?.user) {
    return { error: lookupError?.message ?? "That account no longer exists." };
  }

  const { user } = existing;
  const email = user.email;
  if (!email) {
    return { error: "That account has no email address to invite." };
  }

  // Nothing to resend: they are already in. A forgotten password is a different
  // email and a different screen.
  if (user.last_sign_in_at) {
    return {
      error: `${email} has already signed in. Send a password reset instead.`,
    };
  }

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: await inviteRedirectTo(),
    // Carried over rather than rebuilt: the header greets people by these
    // before their user_data row is read, and passing nothing would leave the
    // metadata as it is anyway — passing the current values keeps that explicit.
    data: user.user_metadata ?? {},
  });

  if (error) {
    if (error.code === "email_exists") {
      // The address is confirmed, so GoTrue treats it as a real account and
      // will not invite it again — an account created straight from the
      // Supabase dashboard usually lands here.
      return {
        error: `${email} is already confirmed, so Supabase won't send another invitation. Send them a password reset (or a magic link from the dashboard) instead.`,
      };
    }
    if (error.code === "over_email_send_rate_limit") {
      return {
        error: `Too many emails sent in the last hour to invite ${email} again. Try again later.`,
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/users");
  return { success: true, email };
}

/**
 * Delete a user: their profile and everything that describes only them, then
 * the auth account itself.
 *
 * The app-side half is one transaction inside public.delete_app_user() — see
 * 20260822140000_delete_app_user.sql for what it keeps and why. The auth user
 * has to go afterwards and separately: user_data references it ON DELETE
 * RESTRICT, so it cannot be removed until that transaction has committed, and
 * `auth.admin.deleteUser` is a service-role endpoint either way.
 *
 * That split is the one failure mode worth knowing about. If the profile goes
 * and the auth deletion then fails, the account survives with no profile — the
 * table lists it as "No profile" and running this again finishes the job, since
 * every step is idempotent.
 */
export async function deleteUser(
  _prev: DeleteUserState,
  formData: FormData
): Promise<DeleteUserState> {
  const supabase = await createClient();
  const guard = await requireAdmin(supabase, "delete users");
  if ("error" in guard) return guard;

  const id = field(formData, "id");
  if (!id) {
    return { error: "Missing user id." };
  }

  // Also enforced inside delete_app_user(), which is what makes it true for any
  // caller rather than just this form.
  if (id === guard.userId) {
    return { error: "You can't delete your own account." };
  }

  const { data, error } = await supabase.rpc("delete_app_user", { p_user: id });
  if (error) {
    return { error: error.message };
  }

  const { error: authError } = await createAdminClient().auth.admin.deleteUser(id);
  if (authError) {
    return {
      error: `The profile was removed, but the sign-in account could not be (${authError.message}). It now shows as "No profile" in the table — deleting it again will finish the job.`,
    };
  }

  revalidatePath("/admin/users");
  return { success: true, kept: data as unknown as KeptRows };
}
