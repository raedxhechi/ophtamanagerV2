"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createDoctorOffice,
  updateDoctorOffice,
  type SaveOfficeState,
} from "../actions";
import type {
  AdminDoctorOfficeRow,
  OfficeUserOption,
} from "./AdminDoctorOfficesData";
import { DoctorOfficeFields } from "./DoctorOfficeFields";
import { NewOfficeUserDrawer } from "./NewOfficeUserDrawer";
import { OfficeUsersField } from "./OfficeUsersField";
import type { PendingUser } from "./pendingUsers";

/**
 * A doctor office: its details, and who works in it. The same drawer creates
 * one — the form is identical, only the action and the wording differ, and
 * splitting them would mean maintaining the office's fields in two places.
 */
export function AdminDoctorOfficeDrawer({
  office,
  users,
  open,
  onOpenChange,
}: {
  /** The office filling the drawer, or null when a new one is being created. */
  office: AdminDoctorOfficeRow | null;
  users: OfficeUserOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="!w-[46vw] !max-w-[46vw]">
        {/*
          Keyed on the office so the form unmounts with the drawer and remounts
          for a different one: that re-seeds the uncontrolled fields, empties the
          invitation queue, and drops the last save's action state, so reopening
          never starts on a previous attempt's error. "new" is its own key, so
          creating after editing does not inherit the office just closed.
        */}
        {open && (
          <DoctorOfficeForm
            key={office?.id ?? "new"}
            office={office}
            users={users}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function DoctorOfficeForm({
  office,
  users,
  onClose,
}: {
  office: AdminDoctorOfficeRow | null;
  users: OfficeUserOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const isNew = office === null;

  // The one controlled field: the nested drawer names the office the new doctor
  // is joining, and while it is being created that name exists nowhere but here.
  const [name, setName] = React.useState(office?.name ?? "");

  // The invitation queue. React state, living exactly as long as this form —
  // see ./pendingUsers for why it is not a store and not localStorage.
  const [pending, setPending] = React.useState<PendingUser[]>([]);
  const [inviting, setInviting] = React.useState(false);

  const queueUser = React.useCallback(
    (user: Omit<PendingUser, "key">) => {
      setPending((current) => {
        if (current.some((queued) => queued.email === user.email)) {
          toast.error(`${user.email} is already queued for this office.`);
          return current;
        }
        return [...current, { ...user, key: crypto.randomUUID() }];
      });
    },
    []
  );

  // Closing and toasting hang off the submission, not off an effect watching
  // `state`: a successful `state` sticks around after its toast, and an effect
  // reading it re-fires on every render where one of its dependencies changed
  // identity — `onClose` is rebuilt by the list on each of its own renders.
  const [state, formAction, isPending] = useActionState(
    async (previous: SaveOfficeState, formData: FormData) => {
      const result = await (isNew
        ? createDoctorOffice(previous, formData)
        : updateDoctorOffice(previous, formData));

      if (result && "success" in result) {
        toast.success(result.created ? "Doctor office created" : "Doctor office saved", {
          description: result.invited.length
            ? `Invitation sent to ${result.invited.join(", ")}.`
            : undefined,
        });

        // The office is saved either way — these are the parts that were not.
        // A separate toast so a warning can't be missed under a success one.
        for (const warning of result.warnings) {
          toast.warning(warning);
        }

        onClose();
        // The action revalidates; the refresh is what re-runs the query for the
        // page the admin is standing on.
        router.refresh();
      }

      return result;
    },
    null
  );

  return (
    <>
      <form action={formAction} className="flex min-h-0 flex-1 flex-col">
        {!isNew && <input type="hidden" name="id" value={office.id} />}

        {/* Pinned: the name stays readable and editable however far the rest of
            the form is scrolled. */}
        <DrawerHeader className="border-b">
          <DrawerTitle>
            {isNew ? "New doctor office" : "Doctor office details"}
          </DrawerTitle>
          <DrawerDescription>
            {isNew
              ? "The practice's own details, and the people who will work in it."
              : "How to reach this practice, and who works in it."}
          </DrawerDescription>
          <div className="grid gap-2 pt-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              placeholder="Praxis Dr. Meier"
            />
          </div>
        </DrawerHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          <DoctorOfficeFields office={office} />

          <OfficeUsersField
            officeId={office?.id ?? null}
            users={users}
            pending={pending}
            onInvite={() => setInviting(true)}
            onRemovePending={(key) =>
              setPending((current) => current.filter((user) => user.key !== key))
            }
          />

          {!isNew && (
            <p className="text-muted-foreground border-t pt-4 text-xs">
              Last changed {formatDate(office.updated_at)}.
            </p>
          )}

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
            ) : isNew ? (
              "Create office"
            ) : (
              "Save changes"
            )}
          </Button>
        </DrawerFooter>
      </form>

      {/* Outside the form on purpose. It portals to the body either way, so the
          DOM would not nest them — but keeping the JSX flat is what makes that
          obvious to the next reader. */}
      <NewOfficeUserDrawer
        officeName={name}
        open={inviting}
        onOpenChange={setInviting}
        onQueue={queueUser}
      />
    </>
  );
}
