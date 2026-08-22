import { redirect } from "next/navigation";

import { createClient } from "@/supabase/server";

import { SetPasswordForm } from "../_components/SetPasswordForm";

/**
 * Where a password-reset link lands, and where a signed-in user can change
 * their password. /auth/confirm has already turned the emailed token into a
 * session by the time this renders.
 */
export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already gates this route; a link that expired never gets a session
  // in the first place, so the useful place to send them is a fresh request.
  if (!user) {
    redirect("/forgot-password?error=linkExpired");
  }

  return (
    <div className="flex flex-col gap-4 p-6 md:p-10">
      <SetPasswordForm variant="updatePassword" />
    </div>
  );
}
