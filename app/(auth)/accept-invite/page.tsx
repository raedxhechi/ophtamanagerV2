import { redirect } from "next/navigation";

import { createClient } from "@/supabase/server";

import { SetPasswordForm } from "../_components/SetPasswordForm";

/**
 * Where an invitation link lands: the account exists but has no password yet.
 * Setting one here is what makes it usable — signups are disabled, so this is
 * the only way into the app besides an admin-issued magic link.
 */
export default async function AcceptInvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No session means the invite link was never accepted (expired, or already
  // used); the login page explains that much.
  if (!user) {
    redirect("/login?error=inviteExpired");
  }

  return (
    <div className="flex flex-col gap-4 p-6 md:p-10">
      <SetPasswordForm variant="acceptInvite" email={user.email} />
    </div>
  );
}
