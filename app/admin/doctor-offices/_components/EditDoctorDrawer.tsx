"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { updateDoctorDetails, type SaveDoctorState } from "../actions";
import type { OfficeUserOption } from "./AdminDoctorOfficesData";

/**
 * The office's default doctor, opened on top of the office drawer so their name
 * and Arzt-Nr. can be corrected without losing the office being edited.
 *
 * It writes on its own — this is a second drawer over a form, not a part of it,
 * and the office's own Save does not reach these columns. Narrower than the
 * office drawer on purpose: the one underneath stays visible along the edge, so
 * which of the two is in front is never in question.
 */
export function EditDoctorDrawer({
  doctor,
  open,
  onOpenChange,
}: {
  /** The doctor being edited, or null when none is picked. */
  doctor: OfficeUserOption | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="!w-[46vw] !max-w-[46vw]">
        <DrawerHeader className="border-b">
          <DrawerTitle>Doctor details</DrawerTitle>
          <DrawerDescription>
            The name and Arzt-Nr. that go onto this office&apos;s prescriptions.
          </DrawerDescription>
        </DrawerHeader>

        {/*
          Keyed on the doctor so the form unmounts with the drawer and remounts
          for a different one: that re-seeds the uncontrolled fields and drops
          the last save's action state, so reopening never starts on a previous
          attempt's error.
        */}
        {open && doctor && (
          <EditDoctorForm
            key={doctor.id}
            doctor={doctor}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function EditDoctorForm({
  doctor,
  onClose,
}: {
  doctor: OfficeUserOption;
  onClose: () => void;
}) {
  const router = useRouter();

  // Closing and toasting hang off the submission, not off an effect watching
  // `state` — the same reason the office form gives: a successful `state`
  // sticks around after its toast, and an effect reading it re-fires whenever a
  // dependency changes identity.
  const [state, formAction, isPending] = useActionState(
    async (previous: SaveDoctorState, formData: FormData) => {
      const result = await updateDoctorDetails(previous, formData);
      if (result && "success" in result) {
        toast.success("Doctor saved");
        onClose();
        // Refreshes the office screen underneath, so the select behind this
        // drawer shows the corrected name. The office drawer is keyed by office
        // id and keeps its own unsaved edits across this.
        router.refresh();
      }
      return result;
    },
    null
  );

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="id" value={doctor.id} />

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="doctor_first_name">First name</Label>
            <Input
              id="doctor_first_name"
              name="first_name"
              defaultValue={doctor.first_name ?? ""}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="doctor_last_name">Last name</Label>
            <Input
              id="doctor_last_name"
              name="last_name"
              defaultValue={doctor.last_name ?? ""}
              autoComplete="off"
            />
          </div>
        </section>

        <section className="grid gap-2">
          <Label htmlFor="doctor_number">Arzt-Nr.</Label>
          <Input
            id="doctor_number"
            name="doctor_number"
            defaultValue={doctor.doctor_number ?? ""}
            autoComplete="off"
          />
          <p className="text-muted-foreground text-xs">
            Printed in the Arzt-Nr. box on this office&apos;s prescriptions.
          </p>
        </section>

        <p className="text-muted-foreground border-t pt-4 text-xs">
          Role and office assignment are not changed here — they belong to the
          account itself, on /admin/users.
        </p>

        {state && "error" in state ? (
          <p className="text-destructive text-sm">{state.error}</p>
        ) : null}
      </div>

      <DrawerFooter className="flex-row items-center justify-end gap-2 border-t">
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
            "Save doctor"
          )}
        </Button>
      </DrawerFooter>
    </form>
  );
}
