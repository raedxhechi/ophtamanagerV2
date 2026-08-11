"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import type { OfficeOption } from "../../_components/OfficeFilter";
import { createPatientAsAdmin } from "../actions";
import { PatientFields } from "./PatientFields";

/**
 * "Add patient" and the drawer behind it. Same fields as the edit drawer plus
 * the office the patient belongs to, which an admin has to name — the
 * office-facing form takes it from the signed-in user, and an admin has no
 * office of their own.
 */
export function AddPatientDrawer({
  offices,
  defaultOfficeId,
}: {
  offices: OfficeOption[];
  /** The office filter's current value, preselected when one is active. */
  defaultOfficeId: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus />
        <span className="hidden lg:inline">Add patient</span>
      </Button>

      <Drawer direction="right" open={open} onOpenChange={setOpen}>
        <DrawerContent className="!w-[46vw] !max-w-[46vw]">
          <DrawerHeader className="border-b">
            <DrawerTitle>New patient</DrawerTitle>
            <DrawerDescription>
              Add a patient to any doctor office.
            </DrawerDescription>
          </DrawerHeader>

          {/*
            The form lives in its own component so it unmounts with the drawer:
            that resets both the fields and the action's state, so reopening
            never starts on the last attempt's values or its error message.
          */}
          <AddPatientForm
            offices={offices}
            defaultOfficeId={defaultOfficeId}
            onClose={() => setOpen(false)}
          />
        </DrawerContent>
      </Drawer>
    </>
  );
}

function AddPatientForm({
  offices,
  defaultOfficeId,
  onClose,
}: {
  offices: OfficeOption[];
  defaultOfficeId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createPatientAsAdmin,
    null
  );

  // Close on success and pull the new patient into the list. The action already
  // revalidates; the refresh is what re-runs the query for the page the admin is
  // standing on.
  React.useEffect(() => {
    if (state && "success" in state) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <PatientFields offices={offices} defaultOfficeId={defaultOfficeId} />

        {state && "error" in state ? (
          <p className="text-destructive text-sm">{state.error}</p>
        ) : null}
      </div>

      <DrawerFooter className="flex-row justify-end gap-2 border-t">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Create patient"
          )}
        </Button>
      </DrawerFooter>
    </form>
  );
}
