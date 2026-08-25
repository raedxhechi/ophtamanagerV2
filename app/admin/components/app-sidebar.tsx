"use client";

import * as React from "react";
import {
  IconChartBar,
  IconDashboard,
  IconFileDescription,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconSearch,
  IconSettings,
  IconShieldCheck,
  IconUsers,
} from "@tabler/icons-react";


import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/admin",
      icon: IconDashboard,
    },
    {
      title: "Patients",
      url: "/admin/patients",
      icon: IconListDetails,
    },
    {
      title: "Orders",
      url: "/admin/orders",
      icon: IconChartBar,
    },
    {
      title: "Sync",
      url: "/admin/sync",
      icon: IconFolder,
    },
    {
      title: "Policies",
      url: "/admin/policies",
      icon: IconShieldCheck,
    },
    {
      title: "Users",
      url: "/admin/users",
      icon: IconUsers,
    },
    {
      title: "Logs",
      url: "/admin/logs",
      icon: IconFileDescription,
    },
  ],
  navClouds: [],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  // documents: [
   
  // ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/admin">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Ophtamanager</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavDocuments items={data.documents} /> */}
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
