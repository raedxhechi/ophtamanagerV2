import { cache } from "react";

import { createClient } from "@/supabase/server";
import type { DoctorOffice, UserRole } from "@/types/user";

/**
 * Which office the private area is working in, and whether the user may change
 * it.
 *
 * `officeId` is the answer every page needs: the office whose patients, orders
 * and drafts are listed, and the office a new patient or order is created in.
 * For a doctor, assistant or pharmacist that is simply the office they belong
 * to. For an admin or a manager it is the one they picked, remembered in
 * `user_settings.selected_doctor_office`.
 */
export type OfficeContext = {
  /**
   * null when there is no office to work in: a single-office user with no
   * profile office, or an admin or manager who has not chosen one yet. Callers
   * must not query on null — they show an empty state instead, and the header
   * asks for a choice.
   */
  officeId: string | null;
  office: DoctorOffice | null;
  /**
   * The offices this user may work in. One entry (or none) for a single-office
   * role; every office for an admin; the access set for a manager.
   */
  options: DoctorOffice[];
  /** Whether to offer the switcher — true for admins and managers. */
  canSwitch: boolean;
  role: UserRole | null;
};

const NO_OFFICE: OfficeContext = {
  officeId: null,
  office: null,
  options: [],
  canSwitch: false,
  role: null,
};

/**
 * The two roles whose office is a choice rather than a fact.
 *
 * An admin reaches every office and belongs to none, so without a selection
 * there is nothing to scope their private-area pages to. A manager reaches
 * several, so a selection is what makes "my patients" mean one office's worth.
 * Everyone else has exactly one and never sees a picker.
 */
export function canSwitchOffices(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "manager";
}

/**
 * Resolve the office context for the signed-in user.
 *
 * Cached for the lifetime of the request: the header and whichever page is
 * rendering both need it, and they are separate components with no way to pass
 * it between them. Every caller after the first is free.
 *
 * Nothing here decides access — RLS does, and it answers to
 * `current_office_ids()` regardless of what is stored. A selection the user
 * may no longer reach (a manager whose grant was revoked) simply isn't in
 * `options`, so it is dropped rather than trusted, and they are asked again.
 */
export const getOfficeContext = cache(async (): Promise<OfficeContext> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NO_OFFICE;

  // maybeSingle: an account can exist in auth with no user_data row — the
  // private layout redirects those to /account-setup, but this runs in server
  // actions too, where a missing row must not throw.
  const { data: userData } = await supabase
    .from("user_data")
    .select("role, doctor_office_id, doctor_office:doctor_office_id(*)")
    .eq("id", user.id)
    .maybeSingle();

  const role = (userData?.role ?? null) as UserRole | null;
  const ownOffice = (userData?.doctor_office ?? null) as DoctorOffice | null;

  if (!canSwitchOffices(role)) {
    return {
      role,
      canSwitch: false,
      options: ownOffice ? [ownOffice] : [],
      office: ownOffice,
      officeId: ownOffice?.id ?? userData?.doctor_office_id ?? null,
    };
  }

  // One query serves both roles, because the RLS on doctor_office already says
  // exactly the right thing: an admin matches "Admins have full access to
  // doctor offices" and gets all of them, while a manager matches "Users can
  // view their connected doctor office", widened to their access set in
  // 20260811120100_create_user_office_access.sql.
  const [{ data: offices }, { data: settings }] = await Promise.all([
    supabase.from("doctor_office").select("*").order("name"),
    supabase
      .from("user_settings")
      .select("selected_doctor_office")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const options = (offices ?? []) as DoctorOffice[];
  const selected = settings?.selected_doctor_office ?? null;

  // The stored choice and nothing else. There is deliberately no fallback to
  // "the first office": picking one for them would mean an admin who has never
  // chosen lands in some office decided by alphabetical order, and every list
  // they read and every patient they create would silently belong to it. Better
  // to have no office than the wrong one — so this stays null until they say,
  // the lists come back empty rather than guessing, and the header offers the
  // choice (see OfficeSetupDialog).
  //
  // The same branch catches a selection that has since been revoked: it is no
  // longer in `options`, so it is dropped rather than trusted, and they are
  // asked again.
  const office = options.find((entry) => entry.id === selected) ?? null;

  return {
    role,
    canSwitch: true,
    options,
    office,
    officeId: office?.id ?? null,
  };
});
