"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { selectDoctorOffice } from "./actions";
import { HEADER_PILL_CLASS } from "./EntitySheet";

export type SwitchableOffice = { id: string; name: string };

/**
 * The doctor office pill, as a dropdown.
 *
 * Only rendered for the roles whose office is a choice — an admin, who reaches
 * every office, and a manager, who reaches their access set. Everyone else sees
 * the plain label, because there is nothing for them to switch to.
 *
 * Picking one writes it to user_settings and revalidates the whole private
 * subtree (see ./actions.ts), so the lists and the create forms come back
 * scoped to the new office. The pending state stays on the pill for that whole
 * round trip: the page behind it re-renders when the action resolves, and until
 * then the old office's rows are still on screen.
 */
export function OfficeSwitcher({
  options,
  selectedId,
  icon,
  label,
  emptyLabel,
}: {
  options: SwitchableOffice[];
  selectedId: string | null;
  icon: React.ReactNode;
  /** Accessible name for the trigger, e.g. "Switch doctor office". */
  label: string;
  /** Shown when the user has no office to pick from at all. */
  emptyLabel: string;
}) {
  const [isPending, startTransition] = React.useTransition();

  const selected = options.find((office) => office.id === selectedId) ?? null;

  const handleSelect = (officeId: string) => {
    if (officeId === selectedId) return;
    startTransition(async () => {
      const result = await selectDoctorOffice(officeId);
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        title={label}
        disabled={isPending || !options.length}
        className={cn(
          HEADER_PILL_CLASS,
          "cursor-pointer transition-all hover:border-white/40 hover:bg-white/20",
          "focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none",
          "disabled:cursor-default disabled:opacity-80"
        )}
      >
        <span className="shrink-0 text-white/80">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : icon}
        </span>
        <span className="truncate">{selected?.name ?? emptyLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-white/70" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="max-h-96 w-64 overflow-y-auto">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((office) => (
          <DropdownMenuItem
            key={office.id}
            onSelect={() => handleSelect(office.id)}
            className="gap-2"
          >
            {/* A fixed slot rather than a conditional icon, so the names line
                up whether or not the row is the selected one. */}
            <span className="flex size-4 shrink-0 items-center justify-center">
              {office.id === selectedId ? <Check className="size-4" /> : null}
            </span>
            <span className="truncate">{office.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
