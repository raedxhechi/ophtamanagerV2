"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type DetailRow = {
  label: string;
  value: string;
};

interface EntitySheetProps {
  /** Text shown on the header button. */
  name: string;
  /** Icon used both on the button and in the sheet header. */
  icon: ReactNode;
  /** Sheet heading (e.g. "Doctor office"). */
  title: string;
  description?: string;
  rows: DetailRow[];
}

/**
 * A header button that, when clicked, opens a right-hand sidebar showing the
 * entity's details. Shared by the doctor office and pharmacy sections.
 */
export function EntitySheet({
  name,
  icon,
  title,
  description,
  rows,
}: EntitySheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 max-w-[11rem] gap-2 rounded-full border border-white/25 bg-white/10 px-4 text-base font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md transition-all hover:border-white/40 hover:bg-white/20 hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] active:bg-white/25 sm:max-w-[15rem]"
        >
          <span className="text-white/80">{icon}</span>
          <span className="truncate">{name}</span>
          <ChevronDown className="size-4 shrink-0 text-white/70" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
              {icon}
            </div>
            <div className="grid gap-0.5">
              <SheetTitle>{title}</SheetTitle>
              {description ? (
                <SheetDescription>{description}</SheetDescription>
              ) : null}
            </div>
          </div>
        </SheetHeader>

        <Separator />

        <dl className="grid gap-5 px-4">
          {rows.map((row) => (
            <div key={row.label} className="grid gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {row.label}
              </dt>
              <dd className="text-sm">{row.value || "—"}</dd>
            </div>
          ))}
        </dl>
      </SheetContent>
    </Sheet>
  );
}
