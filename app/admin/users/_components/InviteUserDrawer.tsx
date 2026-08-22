"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
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

import type { OfficeOption } from "../../_components/OfficeFilter";
import { inviteUser } from "../actions";
import { UserFields } from "./UserFields";

/**
 * "Invite user" and the drawer behind it. Sending the invitation and writing
 * the profile are one action, so nobody arrives with an account that has no
 * role — see ../actions.ts for what happens when only half of it succeeds.
 */
export function InviteUserDrawer({ offices }: { offices: OfficeOption[] }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus />
        <span className="hidden lg:inline">Invite user</span>
      </Button>

      <Drawer direction="right" open={open} onOpenChange={setOpen}>
        <DrawerContent className="!w-[46vw] !max-w-[46vw]">
          <DrawerHeader className="border-b">
            <DrawerTitle>Invite a user</DrawerTitle>
            <DrawerDescription>
              They get an email with a link to choose a password. The role and
              office decide what they see once they are in.
            </DrawerDescription>
          </DrawerHeader>

          {/*
            The form lives in its own component so it unmounts with the drawer:
            that resets both the fields and the action's state, so reopening
            never starts on the last attempt's values or its error message.
          */}
          <InviteUserForm offices={offices} onClose={() => setOpen(false)} />
        </DrawerContent>
      </Drawer>
    </>
  );
}

function InviteUserForm({
  offices,
  onClose,
}: {
  offices: OfficeOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(inviteUser, null);

  // Close on success and pull the new row into the list. The action already
  // revalidates; the refresh is what re-runs the query for the page the admin
  // is standing on.
  React.useEffect(() => {
    if (state && "success" in state) {
      toast.success(`Invitation sent to ${state.email}`);
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <section className="grid gap-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="name@praxis.de"
          />
          <p className="text-muted-foreground text-xs">
            The address the invitation goes to, and the one they sign in with.
          </p>
        </section>

        <UserFields offices={offices} />

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
              Sending…
            </>
          ) : (
            "Send invitation"
          )}
        </Button>
      </DrawerFooter>
    </form>
  );
}
