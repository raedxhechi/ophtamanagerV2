import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { createClient } from "@/supabase/server";
import type { UserSettings } from "@/types";
import type { UserDataWithOffice } from "@/types/user";
import { UserStoreProvider } from "@/zustand/user/user-provider";

import { AppSidebar } from "./components/app-sidebar";
import { SiteHeader } from "./components/site-header";

import "./theme.css";


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already sends a caller with no session to /login and anyone who
  // isn't an admin to /patients. This is the defensive half, and it is what
  // lets everything below treat `user` as present.
  if (!user) {
    redirect("/login");
  }

  // Read once here and hand to the client, rather than having each menu fetch
  // its own copy: this layout re-runs on every load and on every
  // router.refresh(), so the store is re-seeded exactly when the data can have
  // changed. maybeSingle for both — an account can exist in auth with no
  // profile, and a user who has never touched a column selector has no settings
  // row (see the account-setup path in the private layout for the former).
  const [{ data: userData }, { data: settings }] = await Promise.all([
    supabase
      .from("user_data")
      .select("*, doctor_office:doctor_office_id(*)")
      .eq("id", user.id)
      .maybeSingle<UserDataWithOffice>(),
    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle<UserSettings>(),
  ]);

  return (
    <UserStoreProvider
      user={user}
      userData={userData ?? null}
      settings={settings ?? null}
    >
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
          } as React.CSSProperties
        }
        className="max-h-screen overflow-hidden"
      >
        <AppSidebar variant="inset" />
        <SidebarInset className="flex flex-col h-screen overflow-hidden">
          <SiteHeader />
          <div className="flex-1 min-w-0 overflow-y-auto p-4 lg:p-6">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
                {children}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </UserStoreProvider>
  );
}
