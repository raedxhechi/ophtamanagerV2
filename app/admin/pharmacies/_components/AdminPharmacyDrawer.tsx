"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { formatDate } from "@/lib/date";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

import { updatePharmacy, type UpdatePharmacyState } from "../actions";
import type { AdminPharmacyRow, PharmacyOfficeOption } from "./AdminPharmaciesData";
import { PharmacyFields } from "./PharmacyFields";

/**
 * A pharmacy's details: everything an admin may change about it, and the offices
 * it serves. There is no delete button because there is no delete — the table
 * grants none and no policy allows one (see
 * 20260826120100_pharmacies_read_all_edit_admin.sql).
 */
export function AdminPharmacyDrawer({
  pharmacy,
  offices,
  open,
  onOpenChange,
}: {
  /** The pharmacy filling the drawer, or null when nothing is selected. */
  pharmacy: AdminPharmacyRow | null;
  offices: PharmacyOfficeOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="!w-[46vw] !max-w-[46vw]">
        <DrawerHeader className="border-b">
          <DrawerTitle>Pharmacy details</DrawerTitle>
          <DrawerDescription>
            The address and contact the receipt prints, and which doctor offices
            this pharmacy fills orders for.
          </DrawerDescription>
        </DrawerHeader>

        {pharmacy && (
          // The form is its own component so it unmounts with the drawer and
          // remounts for a different pharmacy: that re-seeds the uncontrolled
          // fields and drops the last save's action state, so reopening never
          // starts on a previous attempt's error.
          <AdminPharmacyForm
            key={pharmacy.id}
            pharmacy={pharmacy}
            offices={offices}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function AdminPharmacyForm({
  pharmacy,
  offices,
  onClose,
}: {
  pharmacy: AdminPharmacyRow;
  offices: PharmacyOfficeOption[];
  onClose: () => void;
}) {
  // Closing and toasting hang off the submission, not off an effect watching
  // `state`: a successful `state` sticks around after its toast, and an effect
  // reading it re-fires on every render where one of its dependencies changed
  // identity — `onClose` is rebuilt by the list on each of its own renders.
  const [state, formAction, isPending] = useActionState(
    async (previous: UpdatePharmacyState, formData: FormData) => {
      const result = await updatePharmacy(previous, formData);
      if (result && "success" in result) {
        toast.success("Pharmacy saved");
        onClose();
      }
      return result;
    },
    null
  );

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="id" value={pharmacy.id} />

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <PharmacyFields pharmacy={pharmacy} offices={offices} />

        <p className="text-muted-foreground border-t pt-4 text-xs">
          Last changed {formatDate(pharmacy.updated_at)}.
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
            "Save changes"
          )}
        </Button>
      </DrawerFooter>
    </form>
  );
}
