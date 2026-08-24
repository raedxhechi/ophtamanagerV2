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

/**
 * Validate the two fields that decide what a user can see, shared by invite and
 * edit because a half-provisioned account is the same problem either way.
 */
function parseAssignment(
  formData: FormData
): { error: string } | { role: UserRole; doctor_office_id: string | null } {
  const role = parseRole(field(formData, "role"));
  if (!role) {
    return { error: "Pick a role for this user." };
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
  return { role, doctor_office_id };
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

  const assignment = parseAssignment(formData);
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

  const assignment = parseAssignment(formData);
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
