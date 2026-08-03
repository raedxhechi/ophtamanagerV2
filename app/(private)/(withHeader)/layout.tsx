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

  const { data: userData } = await supabase
    .from("user_data")
    .select("*, doctor_office:doctor_office_id(*)")
    .eq("id", user.id)
    .single<UserDataWithOffice>();

  return (
    // The root <body> is overflow-hidden, so this section owns its own scroll.
    <div className="flex h-svh flex-col overflow-y-auto">
      <SiteHeader user={user} userData={userData} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
