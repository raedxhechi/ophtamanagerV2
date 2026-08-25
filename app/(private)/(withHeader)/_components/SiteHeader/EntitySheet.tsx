"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";

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
import { cn } from "@/lib/utils";

import { ImageLightbox } from "./ImageLightbox";

export type DetailRow = {
  label: string;
  value: string;
};

/**
 * The header's name pill. Exported so a component that replaces it — the office
 * switcher, which turns it into a dropdown trigger — sits at exactly the same
 * size and weight as the plain label beside it.
 */
export const HEADER_PILL_CLASS =
  "flex h-10 max-w-[11rem] items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 text-base font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md sm:max-w-[15rem]";

export type EntityImage = {
  /** Signed, short-lived URL — minted per render by the server component. */
  url: string;
  label: string;
};

interface EntitySheetProps {
  /** Text shown in the header label. */
  name: string;
  /** Icon used both on the label and in the sheet header. */
  icon: ReactNode;
  /** Sheet heading (e.g. "Doctor office"). */
  title: string;
  description?: string;
  rows: DetailRow[];
  /** Optional picture shown under the rows (the office's policy image). */
  image?: EntityImage | null;
  /**
   * Replaces the plain name pill. The doctor office passes the switcher here
   * for the users who may change office; everyone else gets the label. The
   * info button, and the sheet behind it, are the same either way.
   */
  nameSlot?: ReactNode;
}

/**
 * A header label with an info button next to it that opens a right-hand
 * sidebar showing the entity's details. Shared by the doctor office and
 * pharmacy sections.
 */
export function EntitySheet({
  name,
  icon,
  title,
  description,
  rows,
  image,
  nameSlot,
}: EntitySheetProps) {
  const infoLabel = description ?? title;

  return (
    <Sheet>
      <div className="flex min-w-0 items-center gap-1.5">
        {nameSlot ?? (
          <div className={HEADER_PILL_CLASS}>
            <span className="shrink-0 text-white/80">{icon}</span>
            <span className="truncate">{name}</span>
          </div>
        )}

        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            title={infoLabel}
            aria-label={infoLabel}
            className="size-9 shrink-0 rounded-full border border-white/25 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md transition-all hover:border-white/40 hover:bg-white/20 hover:text-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] active:bg-white/25"
          >
            <Info className="size-4" />
          </Button>
        </SheetTrigger>
      </div>

      {/* Wider when it carries an image: the details alone read fine in a
          narrow column, but a scan of a policy document does not. */}
      <SheetContent
        side="right"
        className={cn(
          "w-full",
          image ? "sm:max-w-2xl lg:max-w-3xl" : "sm:max-w-md"
        )}
      >
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

        {/* Owns the scroll: a tall policy image must not push the sheet's own
            layout past the viewport. */}
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
          <dl className="grid gap-5">
            {rows.map((row) => (
              <div key={row.label} className="grid gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="text-sm">{row.value || "—"}</dd>
              </div>
            ))}
          </dl>

          {image ? (
            <div className="grid gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {image.label}
              </span>
              {/* Even a wide sheet is too small for policy small print, so the
                  thumbnail opens a zoomable full-screen view. */}
              <ImageLightbox src={image.url} alt={image.label}>
                <button
                  type="button"
                  className="cursor-zoom-in overflow-hidden rounded-md border transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {/* Plain <img>: the URL is signed and expires, so the Next
                      image optimizer would cache it past its lifetime. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.label}
                    className="w-full object-contain"
                  />
                </button>
              </ImageLightbox>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
