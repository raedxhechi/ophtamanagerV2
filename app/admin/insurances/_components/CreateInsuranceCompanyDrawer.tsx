"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { IconArrowRight, IconCircleCheck, IconPlus } from "@tabler/icons-react";
import { Loader2 } from "lucide-react";

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
  createInsuranceCompany,
  type CreateInsuranceCompanyState,
} from "../actions";
import { InsuranceCompanyFields } from "./InsuranceCompanyFields";

/**
 * "New insurance company" — the button, and the drawer behind it.
 *
 * It sits next to the view switcher rather than inside either screen, so the
 * same button is in reach from the list and from the overview without the two
 * placements drifting apart.
 *
 * **The drawer does not close itself on success.** A company on its own reaches
 * nothing: which medicines it covers and which offices may dispense them are a
 * *policy's* business, and an admin who has just added an insurer is one step
 * into a two-step job. Closing on save would report success for the half that
 * was done and say nothing about the half that wasn't — so the form is replaced
 * by what to do next, with the way there.
 */
export function CreateInsuranceCompanyDrawer() {
  const [open, setOpen] = React.useState(false);
  /**
   * Bumped after each successful create, to remount the form for the next one.
   * The inputs are uncontrolled, so re-seeding them is what clears them.
   */
  const [formKey, setFormKey] = React.useState(0);

  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          setFormKey((key) => key + 1);
          setOpen(true);
        }}
      >
        <IconPlus />
        New insurance company
      </Button>

      <Drawer direction="right" open={open} onOpenChange={setOpen}>
        <DrawerContent className="!w-[46vw] !max-w-[46vw]">
          <DrawerHeader className="border-b">
            <DrawerTitle>New insurance company</DrawerTitle>
            <DrawerDescription>
              What this insurer is called on a prescription, and whether it is
              private or public.
            </DrawerDescription>
          </DrawerHeader>

          {/* Keyed so each create starts on a blank form with no previous
              attempt's error still showing. */}
          <CreateInsuranceCompanyForm
            key={formKey}
            onClose={() => setOpen(false)}
            onCreateAnother={() => setFormKey((key) => key + 1)}
          />
        </DrawerContent>
      </Drawer>
    </>
  );
}

function CreateInsuranceCompanyForm({
  onClose,
  onCreateAnother,
}: {
  onClose: () => void;
  onCreateAnother: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createInsuranceCompany,
    null as CreateInsuranceCompanyState
  );

  // The success panel replaces the form rather than sitting above it: the
  // fields still hold what was just saved, and leaving them editable would
  // offer an edit that this action cannot make.
  if (state && "success" in state) {
    return (
      <CreatedPanel
        name={state.name}
        onClose={onClose}
        onCreateAnother={onCreateAnother}
      />
    );
  }

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <InsuranceCompanyFields />

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
              Creating…
            </>
          ) : (
            "Create insurance company"
          )}
        </Button>
      </DrawerFooter>
    </form>
  );
}

/**
 * What the drawer shows once the company exists: that it does, and the sentence
 * that says the job is not finished.
 */
function CreatedPanel({
  name,
  onClose,
  onCreateAnother,
}: {
  name: string;
  onClose: () => void;
  onCreateAnother: () => void;
}) {
  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <IconCircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-500" />
            <div className="grid gap-1">
              <p className="text-sm font-medium">{name} was created.</p>
              <p className="text-muted-foreground text-sm">
                Create new policies for this company or attach it to existing
                ones
              </p>
            </div>
          </div>

          <div className="mt-4 pl-8">
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/policies">
                Go to policies
                <IconArrowRight />
              </Link>
            </Button>
          </div>
        </div>

        <p className="text-muted-foreground mt-4 text-xs">
          Until a policy names it, this insurer reaches no doctor office and
          covers no medicine — it is only a name patients can be put on.
        </p>
      </div>

      <DrawerFooter className="flex-row items-center justify-end gap-2 border-t">
        <Button type="button" variant="ghost" onClick={onCreateAnother}>
          Create another
        </Button>
        <Button type="button" onClick={onClose}>
          Done
        </Button>
      </DrawerFooter>
    </>
  );
}
