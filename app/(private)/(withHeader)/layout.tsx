import { redirect } from "next/navigation";

import { createClient } from "@/supabase/server";
import type { UserDataWithOffice } from "@/types/user";

import { SiteHeader } from "./_components/SiteHeader/SiteHeader";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already gates this, but guard defensively for types/edge cases.
  if (!user) {
    redirect("/login");
  }

  // maybeSingle, not single: an account can exist in auth with no user_data row
  // yet — between the invitation and the profile insert, or when it was created
  // straight from the Supabase dashboard. That state is supported (the admin
  // users screen lists such accounts and the drawer fixes them), so it must not
  // be an error here. `.single()` asked PostgREST for an object and got a 406 /
  // PGRST116 on every render of every page for those users, which the header
  // then ignored anyway — noise in the audit log describing a state the app
  // already handles. proxy.ts reads the same row the same way.
  const { data: userData } = await supabase
    .from("user_data")
    .select("*, doctor_office:doctor_office_id(*)")
    .eq("id", user.id)
    .maybeSingle<UserDataWithOffice>();

  // No profile means no role and no office, and RLS keys off both: every list
  // on every page comes back empty and correct, so the app looks like it works
  // and shows nothing. /account-setup says what is actually wrong instead.
  //
  // A read that simply failed is null here too, and is sent to the same place;
  // that page re-reads the row and returns anyone who does have one, so a blip
  // costs a redirect rather than stranding them.
  if (!userData) {
    redirect("/account-setup");
  }

  return (
    // The root <body> is overflow-hidden, so this section owns its own scroll.
    <div className="flex h-svh flex-col overflow-y-auto">
      <SiteHeader user={user} userData={userData} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
