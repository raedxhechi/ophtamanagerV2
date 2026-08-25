"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Icon } from "@tabler/icons-react";

import { isActive } from "./nav-active";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

/**
 * The lower nav group. Same routing as NavMain — Link rather than a bare
 * anchor, so moving between these is a client navigation instead of a full
 * reload — but it keeps the sidebar's own quiet active styling rather than
 * NavMain's filled row: these sit below the fold as utilities, and giving them
 * the same emphasis as the sections would flatten the distinction.
 */
export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string;
    url: string;
    icon: Icon;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = usePathname();

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(pathname, item.url);

            return (
              <SidebarMenuItem key={item.title}>
                {/* asChild so the link *is* the button — see NavMain for why an
                    anchor wrapped around one is both invalid and visibly wrong. */}
                <SidebarMenuButton asChild tooltip={item.title} isActive={active}>
                  <Link
                    href={item.url}
                    aria-current={active ? "page" : undefined}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
