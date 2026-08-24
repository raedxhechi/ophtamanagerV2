"use client";

import * as React from "react";
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

import type { OfficeOption } from "../../_components/OfficeFilter";
import { updateUserProfile, type UpdateUserState } from "../actions";
import type { AdminUserRow } from "./AdminUsersData";
import { canResendInvite, ResendInviteButton } from "./ResendInviteButton";
import { UserFields } from "./UserFields";

/** Formats an ISO timestamp as `dd.mm.yyyy, HH:MM`, falling back to the date. */
function formatDateTime(value: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return formatDate(value);
  const time = parsed.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatDate(value)}, ${time}`;
}

function ReadOnlyRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-sm font-mono break-words">
        {value === null || value === undefined || value === "" ? (
          <span className="text-muted-foreground font-sans">—</span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

/**
 * A user's profile: the fields an admin can change, and the account facts they
 * cannot. Email, sign-in history and the account's own timestamps belong to
 * auth and are shown as-is — changing an email means changing the login itself,
 * which is a Supabase dashboard job.
 */
export function AdminUserDrawer({
  user,
  offices,
  open,
  onOpenChange,
}: {
  /** The user filling the drawer, or null when nothing is selected. */
  user: AdminUserRow | null;
  offices: OfficeOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="!w-[46vw] !max-w-[46vw]">
        <DrawerHeader className="border-b">
          <DrawerTitle>User details</DrawerTitle>
          <DrawerDescription>
            Change what this account may reach, or which office it works in.
          </DrawerDescription>
        </DrawerHeader>

        {user && (
          // The form is its own component so it unmounts with the drawer and
          // remounts for a different user: that re-seeds the uncontrolled
          // fields and drops the last save's action state, so reopening never
          // starts on a previous attempt's error.
          <AdminUserForm
            key={user.id}
            user={user}
            offices={offices}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function AdminUserForm({
  user,
  offices,
  onClose,
}: {
  user: AdminUserRow;
  offices: OfficeOption[];
  onClose: () => void;
}) {
  // Closing and toasting hang off the submission, not off an effect watching
  // `state`: a successful `state` sticks around after its toast, and an effect
  // reading it re-fires on every render where one of its dependencies changed
  // identity — `onClose` is rebuilt by the list on each of its own renders — so
  // one save kept announcing itself and slamming the drawer shut again.
  const [state, formAction, isPending] = useActionState(
    async (previous: UpdateUserState, formData: FormData) => {
      const result = await updateUserProfile(previous, formData);
      if (result && "success" in result) {
        toast.success("User saved");
        onClose();
      }
      return result;
    },
    null,
  );

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <input type="hidden" name="id" value={user.id} />

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        {!user.has_profile && (
          <p className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm">
            This account has no profile yet, so it can sign in but sees nothing.
            Give it a role and an office to finish setting it up.
          </p>
        )}

        <UserFields
          offices={offices}
          defaultRole={user.role}
          defaultOfficeId={user.doctor_office?.id ?? null}
          defaultFirstName={user.first_name}
          defaultLastName={user.last_name}
        />

        <section className="grid gap-4 border-t pt-4 sm:grid-cols-2">
          <ReadOnlyRow label="Email" value={user.email} />
          <ReadOnlyRow label="Status" value={user.status} />
          <ReadOnlyRow
            label="Last sign-in"
            value={formatDateTime(user.last_sign_in_at)}
          />
          <ReadOnlyRow
            label="Account created"
            value={formatDateTime(user.created_at)}
          />
          <ReadOnlyRow
            label="Invitation sent"
            value={formatDateTime(user.invited_at)}
          />
          <ReadOnlyRow label="User id" value={user.id} />
        </section>

        {canResendInvite(user.status) && (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {user.status === "invited"
                  ? "This invitation has not been accepted"
                  : "This account was never invited"}
              </p>
              <p className="text-muted-foreground text-xs">
                {user.status === "invited"
                  ? "Sending it again issues a fresh link — the one already in their inbox stops working."
                  : "It exists in auth but never received a link to choose a password."}
              </p>
            </div>
            <ResendInviteButton userId={user.id} status={user.status} />
          </section>
        )}

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
            "Save changes"
          )}
        </Button>
      </DrawerFooter>
    </form>
  );
}
