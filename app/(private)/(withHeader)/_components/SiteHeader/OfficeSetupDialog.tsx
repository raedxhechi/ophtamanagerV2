"use client";

import * as React from "react";
import { Building2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { selectDoctorOffice } from "./actions";
import type { SwitchableOffice } from "./OfficeSwitcher";

/**
 * The first-run prompt for an admin or manager who has not picked an office.
 *
 * Without a selection every list on every page is empty — correctly, since the
 * app does not know which office is meant — and an empty app with no
 * explanation reads as broken. This says what to do and does it in one click.
 *
 * Rendered by SiteHeader only while the selection is genuinely missing, so it
 * disappears of its own accord: picking an office revalidates the layout, the
 * condition stops holding, and this unmounts.
 *
 * Closable on purpose. There is a real reason to leave without choosing — an
 * admin heading back to /admin — and trapping them behind a modal to reach a
 * button in the same header would be worse than asking again on the next page.
 * The switcher in the header stays available either way.
 */
export function OfficeSetupDialog({ options }: { options: SwitchableOffice[] }) {
  const t = useTranslations("header");
  const [open, setOpen] = React.useState(true);
  const [isPending, startTransition] = React.useTransition();
  const [choosing, setChoosing] = React.useState<string | null>(null);

  const handleSelect = (officeId: string) => {
    setChoosing(officeId);
    startTransition(async () => {
      const result = await selectDoctorOffice(officeId);
      if (result?.error) {
        toast.error(result.error);
        setChoosing(null);
        return;
      }
      // Not strictly needed — the revalidation unmounts this — but it closes on
      // the spot rather than at the end of the round trip.
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("selectOfficeTitle")}</DialogTitle>
          <DialogDescription>
            {options.length
              ? t("selectOfficeDescription")
              : t("selectOfficeEmpty")}
          </DialogDescription>
        </DialogHeader>

        {options.length ? (
          // Buttons rather than a select plus a confirm: there is exactly one
          // decision here and it should cost one click.
          <div className="-mx-1 max-h-80 space-y-1 overflow-y-auto px-1">
            {options.map((office) => (
              <Button
                key={office.id}
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => handleSelect(office.id)}
                className="h-11 w-full justify-start gap-2"
              >
                {isPending && choosing === office.id ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : (
                  <Building2 className="text-muted-foreground size-4 shrink-0" />
                )}
                <span className="truncate">{office.name}</span>
              </Button>
            ))}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
