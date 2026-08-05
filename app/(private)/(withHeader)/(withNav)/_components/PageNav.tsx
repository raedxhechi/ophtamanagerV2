"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ClipboardList,
  FileClock,
  PackagePlus,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  labelKey:
    | "viewPatients"
    | "addPatient"
    | "viewOrders"
    | "addOrder"
    | "viewDraftOrders";
  href: string;
  icon: LucideIcon;
  color: "blue" | "black";
};

const leftItems: NavItem[] = [
  { labelKey: "viewPatients", href: "/patients", icon: Users, color: "blue" },
  { labelKey: "addPatient", href: "/patients/new", icon: UserPlus, color: "blue" },
];

const rightItems: NavItem[] = [
  {
    labelKey: "viewDraftOrders",
    href: "/draft-orders",
    icon: FileClock,
    color: "black",
  },
  { labelKey: "viewOrders", href: "/orders", icon: ClipboardList, color: "black" },
  { labelKey: "addOrder", href: "/orders/new", icon: PackagePlus, color: "black" },
];

function NavButton({
  item,
  active,
  label,
}: {
  item: NavItem;
  active: boolean;
  label: string;
}) {
  const Icon = item.icon;
  const isBlue = item.color === "blue";
  return (
    <Button
      asChild
      size="sm"
      className={cn(
        "h-9 gap-2 px-3.5 text-sm font-medium text-white shadow-sm",
        isBlue
          ? "bg-blue-600 hover:bg-blue-700"
          : "bg-neutral-900 hover:bg-black",
        active &&
          cn(
            "ring-2 ring-offset-2 ring-offset-background",
            isBlue ? "ring-blue-400" : "ring-neutral-500"
          )
      )}
    >
      <Link href={item.href}>
        <Icon className="size-4" />
        {label}
      </Link>
    </Button>
  );
}

export function PageNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav className="sticky top-20 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex w-full max-w-[96rem] items-center gap-4 px-6 py-5 lg:px-10">
        {/* Left section — buttons aligned left */}
        <div className="flex flex-1 items-center justify-start gap-3">
          {leftItems.map((item) => (
            <NavButton
              key={item.href}
              item={item}
              label={t(item.labelKey)}
              active={pathname === item.href}
            />
          ))}
        </div>

        {/* Right section — buttons aligned right */}
        <div className="flex flex-1 items-center justify-end gap-3">
          {rightItems.map((item) => (
            <NavButton
              key={item.href}
              item={item}
              label={t(item.labelKey)}
              active={pathname === item.href}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
