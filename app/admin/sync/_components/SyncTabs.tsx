"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin/sync", label: "Overview", exact: true },
  { href: "/admin/sync/patients", label: "Patients", exact: false },
  { href: "/admin/sync/doctor-offices", label: "Doctor offices", exact: false },
  { href: "/admin/sync/medicines", label: "Medicines", exact: false },
  {
    href: "/admin/sync/insurance-companies",
    label: "Insurance companies",
    exact: false,
  },
  {
    href: "/admin/sync/insurance-policies",
    label: "Insurance policies",
    exact: false,
  },
  { href: "/admin/sync/orders", label: "Orders", exact: false },
];

export function SyncTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
