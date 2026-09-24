import Link from "next/link";
import { IconLayoutColumns, IconTable } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export type InsurancesView = "companies" | "overview";

const views: {
  key: InsurancesView;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: "companies",
    href: "/admin/insurances",
    label: "Insurance companies",
    icon: IconTable,
  },
  {
    key: "overview",
    href: "/admin/insurances/overview",
    label: "Overview",
    icon: IconLayoutColumns,
  },
];

/**
 * The strip above both insurance screens. It looks like a tab strip and is
 * navigation: the list and the overview are two routes, so each is a link you
 * can send someone, and the browser's back button steps between them.
 *
 * It is deliberately not Radix's `Tabs`. Those are one page showing one panel at
 * a time, which meant either throwing the overview's three-deep selection away
 * on every visit to the list (Radix unmounts the panel that isn't showing) or
 * reaching for `forceMount` — and `forceMount` makes `hidden` unconditionally
 * false, so both panels render stacked and the strip stops appearing to do
 * anything at all. Two routes have neither problem, and no ARIA tab semantics
 * are borrowed for something that is not a tab.
 */
export function InsurancesNav({ active }: { active: InsurancesView }) {
  return (
    <nav
      aria-label="Insurances views"
      className="bg-muted inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]"
    >
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = view.key === active;

        return (
          <Link
            key={view.key}
            href={view.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring/50 inline-flex h-[calc(100%-1px)] items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-none [&_svg]:size-4 [&_svg]:shrink-0",
              isActive
                ? "bg-background text-foreground dark:border-input dark:bg-input/30 shadow-sm"
                : "text-foreground dark:text-muted-foreground"
            )}
          >
            <Icon />
            {view.label}
          </Link>
        );
      })}
    </nav>
  );
}
