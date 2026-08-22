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
import { updateUserProfile } from "../actions";
import type { AdminUserRow } from "./AdminUsersData";
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
  const [state, formAction, isPending] = useActionState(updateUserProfile, null);

  // Close the drawer once a save succeeds.
  React.useEffect(() => {
    if (state && "success" in state) {
      toast.success("User saved");
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

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
          // `key` re-seeds the uncontrolled fields whenever a different user is
          // opened without the drawer closing in between.
          <form
            key={user.id}
            action={formAction}
            className="flex min-h-0 flex-1 flex-col"
          >
            <input type="hidden" name="id" value={user.id} />

            <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
              {!user.has_profile && (
                <p className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm">
                  This account has no profile yet, so it can sign in but sees
                  nothing. Give it a role and an office to finish setting it up.
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
                <ReadOnlyRow label="User id" value={user.id} />
              </section>

              {state && "error" in state ? (
                <p className="text-destructive text-sm">{state.error}</p>
              ) : null}
            </div>

            <DrawerFooter className="flex-row justify-end gap-2 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
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
        )}
      </DrawerContent>
    </Drawer>
  );
}
