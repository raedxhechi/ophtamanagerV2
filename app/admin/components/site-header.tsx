"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconStethoscope } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { UserNav } from "./user-nav";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatSegment(segment: string) {
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SiteHeader() {
  const pathName = usePathname();
  const t = useTranslations("Breadcrumb");
  const paths = pathName.split("/").filter((p) => !!p && !UUID_RE.test(p));



  return (
    <header className="rheal-header flex h-(--header-height) shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {/* Desktop: sidebar toggle. Hidden on mobile — the bottom bar is the nav there. */}
        <SidebarTrigger className="-ml-1 hidden md:flex" />

        {/* Desktop breadcrumb */}
        <div className="hidden md:flex items-center gap-1 lg:gap-2 min-w-0">
          {paths.map((path, idx) => (
            <Fragment key={`${path}-${idx}`}>
              <Separator
                orientation="vertical"
                className="rheal-separator mx-2 data-[orientation=vertical]:h-4"
              />
              <span
                className={
                  idx === paths.length - 1
                    ? "rheal-breadcrumb-active"
                    : "rheal-breadcrumb-ancestor"
                }
              >
                {t.has(path) ? t(path) : formatSegment(path)}
              </span>
            </Fragment>
          ))}
        </div>

        {/* Mobile: Logo and platform name */}
        <div className="md:hidden flex items-center gap-2.5 overflow-hidden">
          <div className="rheal-logo-mark overflow-hidden size-8 min-w-8 min-h-8 shrink-0">
            {/* <RhealMark size={32} /> */}
          </div>
          <span className="rheal-wordmark truncate">ophthamanager</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* The way back into the practice app, mirroring the Admin button
              that brings you here from its header. /patients rather than /:
              there is no root page, and proxy.ts redirects it here anyway. */}
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/patients">
              <IconStethoscope className="size-4" />
              <span className="hidden sm:inline">Go to app</span>
            </Link>
          </Button>
          <UserNav />
        </div>
      </div>
    </header>
  );
}
