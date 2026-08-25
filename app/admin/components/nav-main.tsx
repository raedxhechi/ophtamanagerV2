"use client";

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
 * The filled-primary treatment the stock "Quick Create" button used to carry,
 * moved onto whichever nav item matches the current route.
 *
 * Every class is written under the same `data-[active=true]:` prefix that
 * SidebarMenuButton's own active styles use, so tailwind-merge resolves the two
 * against each other and these win — an unprefixed `bg-primary` would lose to
 * the component's more specific `data-[active=true]:bg-sidebar-accent`.
 */
const ACTIVE_ITEM =
  "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary/90 data-[active=true]:hover:text-primary-foreground data-[active=true]:active:bg-primary/90 data-[active=true]:active:text-primary-foreground";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: Icon;
  }[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(pathname, item.url);

            return (
              <SidebarMenuItem key={item.title}>
                {/* asChild so the link *is* the button: an anchor wrapped around
                    one is invalid markup, and it shrank the row to the width of
                    its label — which the filled active state makes obvious. */}
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={active}
                  className={ACTIVE_ITEM}
                >
                  <Link href={item.url} aria-current={active ? "page" : undefined}>
                    {item.icon && <item.icon />}
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
