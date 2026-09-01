"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/supabase/admin";
import { createClient } from "@/supabase/server";
import type { UserRole } from "@/types/user";

import {
  PENDING_USERS_FIELD,
  PENDING_USER_ROLE,
  type PendingUser,
} from "./_components/pendingUsers";

export type SaveOfficeState =
  | { error: string }
  | {
      success: true;
      /** The office that was written — its new id on a create. */
      id: string;
      created: boolean;
      /** Addresses that were invited, in the order they were queued. */
      invited: string[];
      /**
       * Everything that could not be done but did not undo the save: an
       * assignment the roles refuse, an invitation the mail server rejected.
       * The office itself is saved whenever `success` is returned.
       */
      warnings: string[];
    }
  | null;

/** Trim a FormData string field, returning null when empty. */
function field(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? null : trimmed;
}

/** Shape check on the ids coming out of the form, before they reach a filter. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The same loose check the invite form uses — a typo, not a spec. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Creating an office and moving people between offices are both admin-only.
 * "Admins have full access to doctor offices" and "Admins have full access to
 * office access rows" say the same thing; this is what turns "no rows matched"
 * into a sentence.
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

/** The office's own columns, as the drawer submits them. */
type OfficeInput = {
  name: string;
  contact_person: string | null;
  email: string | null;
  phone_number: string | null;
  street: string | null;
  house_number: string | null;
  zipcode: string | null;
  city: string | null;
};

/**
 * The office fields, shared by create and update because the drawer is the same
 * form either way.
 *
 * `pharmacy_id` is deliberately not among them: an office joins the default
 * pharmacy on insert (20260826150000_doctor_office_joins_default_pharmacy.sql)
 * and moving it between pharmacies is not something this screen offers — the
 * pharmacies screen shows the same link from the other side, also read-only.
 */
function parseOffice(formData: FormData): { error: string } | OfficeInput {
  const name = field(formData, "name");
  if (!name) {
    return { error: "A doctor office needs a name." };
  }

  // Optional, but a mistyped one is worse than none: it is the address the
  // office is reached on. The column takes any text — this is the form's check,
  // not the database's.
  const email = field(formData, "email");
  if (email && !EMAIL.test(email)) {
    return { error: "Enter a valid email address for the office, or leave it empty." };
  }

  return {
    name,
    contact_person: field(formData, "contact_person"),
    email,
    phone_number: field(formData, "phone_number"),
    street: field(formData, "street"),
    house_number: field(formData, "house_number"),
    zipcode: field(formData, "zipcode"),
    city: field(formData, "city"),
  };
}

/** A user as the membership diff needs them: their role and where they stand. */
type Membership = {
  id: string;
  label: string;
  role: UserRole;
  /** user_data.doctor_office_id — the active office. */
  activeOfficeId: string | null;
  /** public.user_office_access — every office they may work in. */
  officeIds: string[];
};

/** "Dr. Meier" / "meier@praxis.de" / the id — whatever the row can offer. */
function labelFor(profile: {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}): string {
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  return name || profile.email || profile.id;
}

/**
 * Bring the office's user list in line with what the drawer ticked.
 *
 * "Assigned to this office" is two different writes depending on the role, and
 * this is the whole of that asymmetry (see "Multi-office access" in context.md):
 *
 * - A **manager** holds a set of offices, so ticking grants one more row in
 *   user_office_access and unticking revokes it. Their active office only moves
 *   when it is the one being revoked, and then to the first office they have
 *   left — the same rule /admin/users applies, in the same order (by name).
 * - **Everyone else** has exactly one office, which is also the whole of their
 *   access, so ticking is a *move*: it writes user_data.doctor_office_id, and
 *   the trigger from 20260811120100 collapses their access set onto it, taking
 *   the old office away in the same statement.
 *
 * Which is why unticking has cases it refuses rather than performs. A doctor
 * with no office sees nothing at all, and a manager with none is the same
 * thing — so those come back as warnings and the row is left as it was. The
 * drawer disables those checkboxes, so getting one here means the page was
 * stale; the office's own save still stands.
 */
async function applyMembership(
  supabase: SupabaseClient,
  officeId: string,
  formData: FormData
): Promise<string[]> {
  const warnings: string[] = [];

  const wanted = new Set(
    formData
      .getAll("member_ids")
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => UUID.test(value))
  );

  const [profilesResult, accessResult, officesResult] = await Promise.all([
    supabase.from("user_data").select("id, email, first_name, last_name, role, doctor_office_id"),
    supabase.from("user_office_access").select("user_id, doctor_office_id"),
    supabase.from("doctor_office").select("id").order("name"),
  ]);

  if (profilesResult.error) return [profilesResult.error.message];
  if (accessResult.error) return [accessResult.error.message];
  if (officesResult.error) return [officesResult.error.message];

  // The office list's own order (by name), so "the first office they have left"
  // means the same thing here as it does in the picker and on /admin/users.
  const rank = new Map(
    (officesResult.data ?? []).map((office, index) => [office.id, index])
  );

  const accessByUser = new Map<string, string[]>();
  for (const grant of accessResult.data ?? []) {
    const held = accessByUser.get(grant.user_id);
    if (held) held.push(grant.doctor_office_id);
    else accessByUser.set(grant.user_id, [grant.doctor_office_id]);
  }

  const users: Membership[] = (profilesResult.data ?? []).map((profile) => ({
    id: profile.id,
    label: labelFor(profile),
    role: profile.role,
    activeOfficeId: profile.doctor_office_id,
    officeIds: accessByUser.get(profile.id) ?? [],
  }));

  for (const user of users) {
    const isMember =
      user.activeOfficeId === officeId || user.officeIds.includes(officeId);
    const shouldBeMember = wanted.has(user.id);
    if (isMember === shouldBeMember) continue;

    if (shouldBeMember) {
      const error = await addToOffice(supabase, officeId, user);
      if (error) warnings.push(`${user.label}: ${error}`);
    } else {
      const error = await removeFromOffice(supabase, officeId, user, rank);
      if (error) warnings.push(`${user.label}: ${error}`);
    }
  }

  return warnings;
}

/** Put a user into this office — a grant for a manager, a move for anyone else. */
async function addToOffice(
  supabase: SupabaseClient,
  officeId: string,
  user: Membership
): Promise<string | null> {
  if (user.role === "manager") {
    // ignoreDuplicates so re-saving an unchanged set is a no-op rather than a
    // rewrite: created_at says when the office was granted, not when the drawer
    // was last opened.
    const { error } = await supabase.from("user_office_access").upsert(
      { user_id: user.id, doctor_office_id: officeId },
      { onConflict: "user_id,doctor_office_id", ignoreDuplicates: true }
    );
    return error?.message ?? null;
  }

  // Everyone else moves. The trigger revokes whichever office they were in, so
  // this single write is the whole of it.
  const { error } = await supabase
    .from("user_data")
    .update({ doctor_office_id: officeId, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  return error?.message ?? null;
}

/**
 * Take this office away from a user — where that leaves them somewhere valid.
 *
 * An admin reaches every office and needs none of their own, and a manager can
 * spare one as long as they keep another. A doctor, assistant or pharmacist
 * cannot: the office *is* their access, so they are moved rather than removed,
 * and that is done by ticking them into the office they are moving to.
 */
async function removeFromOffice(
  supabase: SupabaseClient,
  officeId: string,
  user: Membership,
  rank: Map<string, number>
): Promise<string | null> {
  if (user.role === "admin") {
    // Clearing the active office is enough on its own: the trigger deletes
    // every access row that isn't the new value, and for null that is all of
    // them.
    const { error } = await supabase
      .from("user_data")
      .update({ doctor_office_id: null, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    return error?.message ?? null;
  }

  if (user.role !== "manager") {
    return "they need exactly one office, so move them to another office instead of removing them here.";
  }

  const remaining = user.officeIds
    .filter((id) => id !== officeId)
    .sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));

  if (!remaining.length) {
    return "this is their only office, and a manager needs at least one.";
  }

  const { error } = await supabase
    .from("user_office_access")
    .delete()
    .eq("user_id", user.id)
    .eq("doctor_office_id", officeId);

  if (error) return error.message;

  // Only when the office being taken away is the one they create in. Removing
  // any other office must not move where their next order lands.
  if (user.activeOfficeId === officeId) {
    const { error: pointerError } = await supabase
      .from("user_data")
      .update({
        doctor_office_id: remaining[0],
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (pointerError) return pointerError.message;
  }

  return null;
}

/**
 * Where an invitation should land if the template is ever reset to the stock
 * `{{ .ConfirmationURL }}` — ours builds its own link to /auth/confirm, so this
 * is only a fallback. Taken from the request so it follows whichever host the
 * admin is working on. Same as /admin/users' copy, for the same reasons.
 */
async function inviteRedirectTo(): Promise<string | undefined> {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  return host
    ? `${proto}://${host}/auth/callback?next=/accept-invite`
    : undefined;
}

/** Read the queued invitations back out of the form, dropping anything malformed. */
function parsePendingUsers(formData: FormData): PendingUser[] {
  const rows: PendingUser[] = [];

  for (const value of formData.getAll(PENDING_USERS_FIELD)) {
    if (typeof value !== "string") continue;
    try {
      const parsed = JSON.parse(value) as Partial<PendingUser>;
      const email = parsed.email?.trim().toLowerCase();
      if (!email) continue;
      rows.push({
        key: typeof parsed.key === "string" ? parsed.key : email,
        email,
        first_name: parsed.first_name?.trim() || null,
        last_name: parsed.last_name?.trim() || null,
      });
    } catch {
      // A hidden field this form wrote itself, so a parse failure is a bug
      // rather than input — skip the row instead of failing the whole save.
    }
  }

  return rows;
}

/**
 * Send the invitations the drawer queued up, now that the office has an id.
 *
 * The same two writes /admin/users makes, in the same order and for the same
 * reasons: the Supabase invitation (a service-role endpoint) and then the
 * user_data row that gives the account its role and its office, written with
 * the admin's own session so RLS authorises it. The role is not a form field —
 * this screen only ever creates doctors.
 *
 * Nothing here can undo the office. An invitation that fails is reported and
 * the rest are still attempted: they are independent people, and an address
 * with a typo in it should not cost the other three their accounts.
 */
async function sendQueuedInvites(
  supabase: SupabaseClient,
  officeId: string,
  formData: FormData
): Promise<{ invited: string[]; warnings: string[] }> {
  const pending = parsePendingUsers(formData);
  if (!pending.length) return { invited: [], warnings: [] };

  const invited: string[] = [];
  const warnings: string[] = [];
  const redirectTo = await inviteRedirectTo();
  const admin = createAdminClient();

  for (const user of pending) {
    if (!EMAIL.test(user.email)) {
      warnings.push(`${user.email} is not a valid email address, so nobody was invited.`);
      continue;
    }

    const { data, error } = await admin.auth.admin.inviteUserByEmail(user.email, {
      redirectTo,
      // user_metadata — the site header greets people by these before their
      // user_data row is ever read.
      data: { first_name: user.first_name, last_name: user.last_name },
    });

    if (error) {
      warnings.push(
        error.code === "email_exists"
          ? `${user.email} already has an account, so no invitation was sent. Assign the existing account to this office instead.`
          : `${user.email} could not be invited (${error.message}).`
      );
      continue;
    }

    const { error: profileError } = await supabase.from("user_data").insert({
      id: data.user.id,
      email: user.email,
      role: PENDING_USER_ROLE,
      doctor_office_id: officeId,
      first_name: user.first_name,
      last_name: user.last_name,
    });

    if (profileError) {
      // The invitation is out and the account exists; deleting it to tidy up
      // would be worse than saying so. /admin/users lists it as "No profile"
      // and opening it finishes the job.
      warnings.push(
        `${user.email} was invited, but their role could not be saved (${profileError.message}). Finish setting them up on the users screen.`
      );
      continue;
    }

    invited.push(user.email);
  }

  return { invited, warnings };
}

/**
 * Create a doctor office, then everything that needed its id.
 *
 * The order is the whole point of this action. A user cannot be assigned to an
 * office that does not exist yet and an invitation has to name one, so the
 * drawer parks both — the ticked existing users and the queued new ones — and
 * they are applied here against the id the insert hands back. One action rather
 * than a client-side chain, so a page that navigates away mid-save cannot leave
 * an office with none of the people it was created for.
 *
 * The office is committed before either runs, and neither can roll it back: a
 * refused assignment or a bounced invitation comes back as a warning on a save
 * that succeeded, which is what `warnings` is for.
 */
export async function createDoctorOffice(
  _prev: SaveOfficeState,
  formData: FormData
): Promise<SaveOfficeState> {
  const supabase = await createClient();
  const guard = await requireAdmin(supabase, "create doctor offices");
  if ("error" in guard) return guard;

  const office = parseOffice(formData);
  if ("error" in office) return office;

  // pharmacy_id is left out rather than nulled, so the insert trigger fills it
  // in with the default pharmacy.
  const { data: created, error } = await supabase
    .from("doctor_office")
    .insert(office)
    .select("id")
    .single();

  if (error) return { error: error.message };

  const warnings = await applyMembership(supabase, created.id, formData);
  const { invited, warnings: inviteWarnings } = await sendQueuedInvites(
    supabase,
    created.id,
    formData
  );

  revalidatePath("/admin/doctor-offices");
  revalidatePath("/admin/users");
  return {
    success: true,
    id: created.id,
    created: true,
    invited,
    warnings: [...warnings, ...inviteWarnings],
  };
}

/**
 * Save an existing doctor office: its own fields, who works in it, and any
 * doctors queued up while the drawer was open.
 *
 * The invitations are queued here too, rather than sent the moment the nested
 * drawer is filled in. The office already has an id, so they *could* go
 * straight out — but then Cancel would only cancel half the drawer, and an
 * invitation is not something an admin can take back.
 */
export async function updateDoctorOffice(
  _prev: SaveOfficeState,
  formData: FormData
): Promise<SaveOfficeState> {
  const supabase = await createClient();
  const guard = await requireAdmin(supabase, "edit doctor offices");
  if ("error" in guard) return guard;

  const id = field(formData, "id");
  if (!id || !UUID.test(id)) {
    return { error: "That doctor office could not be identified." };
  }

  const office = parseOffice(formData);
  if ("error" in office) return office;

  // Read the row back: an update refused by RLS matches no rows and reports no
  // error, which is indistinguishable from a save that changed nothing.
  const { data: saved, error } = await supabase
    .from("doctor_office")
    .update({ ...office, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!saved) {
    return {
      error: "That doctor office could not be saved. It may have been removed.",
    };
  }

  const warnings = await applyMembership(supabase, id, formData);
  const { invited, warnings: inviteWarnings } = await sendQueuedInvites(
    supabase,
    id,
    formData
  );

  revalidatePath("/admin/doctor-offices");
  revalidatePath("/admin/users");
  return {
    success: true,
    id,
    created: false,
    invited,
    warnings: [...warnings, ...inviteWarnings],
  };
}
