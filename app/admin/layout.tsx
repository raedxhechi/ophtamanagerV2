import { cookies } from "next/headers";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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

  return (
    // <AuthProvider>



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
       <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6 " 
      //  style={{ backgroundColor: "red" }}
       >

          {children}
       </div>
       </div>
          </div>
      </SidebarInset>
    </SidebarProvider>
    
    // </AuthProvider>
  );
}
