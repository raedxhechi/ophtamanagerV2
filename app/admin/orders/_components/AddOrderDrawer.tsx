"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { CreateOrderForm } from "@/app/(private)/(withHeader)/(withNav)/orders/new/_components/CreateOrderForm/CreateOrderForm";

import type { OfficeOption } from "../../_components/OfficeFilter";

/**
 * "Add order" and the drawer behind it.
 *
 * The form is the office-facing one from `/orders/new`, not a copy: creating an
 * order carries real rules — a public insurer only accepts medicines its office
 * has a policy for, the quantity is derived per eye, medicine type gates the
 * medicine list — and those live in that form.
 *
 * The one thing it can't infer here is the office. An office user's is implied
 * by their session; an admin has none, so it's picked first and then decides
 * which patients the picker offers, which policies rule on coverage, and which
 * office the order is filed under.
 */
export function AddOrderDrawer({
  offices,
  defaultOfficeId,
}: {
  offices: OfficeOption[];
  /** The office filter's current value, preselected when one is active. */
  defaultOfficeId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [officeId, setOfficeId] = React.useState(defaultOfficeId);

  // Follow the list's filter while the drawer is closed, so opening it lands on
  // the office the admin is already looking at.
  React.useEffect(() => {
    if (!open) setOfficeId(defaultOfficeId);
  }, [open, defaultOfficeId]);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus />
        <span className="hidden lg:inline">Add order</span>
      </Button>

      <Drawer direction="right" open={open} onOpenChange={setOpen}>
        <DrawerContent className="!w-[78vw] !max-w-[78vw]">
          <DrawerHeader className="border-b">
            <DrawerTitle>New order</DrawerTitle>
            <DrawerDescription>
              Pick the office the order is for, then build it as that office
              would.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
            <div className="flex max-w-sm flex-col gap-2">
              <Label htmlFor="order-office">
                Doctor office <span className="text-destructive">*</span>
              </Label>
              {/* Not the list's OfficeFilter: "All offices" is a filter, and an
                  order has to be filed under exactly one. */}
              <Select
                value={officeId || undefined}
                onValueChange={setOfficeId}
              >
                <SelectTrigger id="order-office" className="h-9 w-full">
                  <SelectValue placeholder="Select a doctor office" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {offices.map((office) => (
                    <SelectItem key={office.id} value={office.id}>
                      {office.name ?? "Unnamed office"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {officeId ? (
              // Remounted per office: the patients already added belong to the
              // office they were picked from, so switching starts a fresh order
              // rather than carrying them across.
              <CreateOrderForm
                key={officeId}
                type="new"
                doctorOfficeId={officeId}
                // Drafts belong to the office user who'll come back and finish
                // them, so the admin form doesn't offer parking one.
                allowDraft={false}
                onFinish={() => {
                  setOpen(false);
                  router.refresh();
                }}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                Select a doctor office to start the order.
              </p>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
