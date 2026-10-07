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

import {
  updateInsuranceCompany,
  type UpdateInsuranceCompanyState,
} from "../actions";
import { InsuranceCompanyFields } from "./InsuranceCompanyFields";
import type { AdminInsuranceCompanyRow } from "./types";

/**
 * An insurance company's details: the three things an admin may change about
 * it, and the policies it is named in. There is no delete button — a company a
 * patient or a policy still points at cannot be removed (both foreign keys are
 * ON DELETE RESTRICT), and new ones arrive through the Directus import on
 * /admin/sync rather than being typed in here.
 */
export function AdminInsuranceCompanyDrawer({
  company,
  open,
  onOpenChange,
}: {
  /** The company filling the drawer, or null when nothing is selected. */
  company: AdminInsuranceCompanyRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="!w-[46vw] !max-w-[46vw]">
        <DrawerHeader className="border-b">
          <DrawerTitle>{company?.name ?? "Insurance company"}</DrawerTitle>
          <DrawerDescription>
            What this insurer is called on a prescription, whether it is private
            or public, and which policies name it.
          </DrawerDescription>
        </DrawerHeader>

        {company && (
          // The form is its own component so it unmounts with the drawer and
          // remounts for a different company: that re-seeds the uncontrolled
          // fields and drops the last save's action state, so reopening never
          // starts on a previous attempt's error.
          <AdminInsuranceCompanyForm
            key={company.id}
            company={company}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function AdminInsuranceCompanyForm({
  company,
  onClose,
}: {
  company: AdminInsuranceCompanyRow;
  onClose: () => void;
}) {
  // Closing and toasting hang off the submission, not off an effect watching
  // `state`: a successful `state` sticks around after its toast, and an effect
  // reading it re-fires on every render where one of its dependencies changed
  // identity — `onClose` is rebuilt by the list on each of its own renders.
  const [state, formAction, isPending] = useActionState(
    async (previous: UpdateInsuranceCompanyState, formData: FormData) => {
      const result = await updateInsuranceCompany(previous, formData);
      if (result && "success" in result) {
        toast.success("Insurance company saved");
        onClose();
      }
      return result;
    },
    null
  );

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="id" value={company.id} />

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <InsuranceCompanyFields company={company} />

        <p className="text-muted-foreground border-t pt-4 text-xs">
          Last changed {formatDate(company.updated_at)}.
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
