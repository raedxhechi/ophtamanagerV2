"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
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
import { deleteUser, updateUserProfile, type KeptRows } from "../actions";
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

/** "3 orders and 128 log entries" — the rows a delete leaves behind. */
function describeKept({ orders, draft_orders, system_logs }: KeptRows): string | null {
  const parts = [
    orders && `${orders} order${orders === 1 ? "" : "s"}`,
    draft_orders && `${draft_orders} draft${draft_orders === 1 ? "" : "s"}`,
    system_logs && `${system_logs} log entr${system_logs === 1 ? "y" : "ies"}`,
  ].filter(Boolean) as string[];

  if (!parts.length) return null;
  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `${list} kept, no longer linked to anyone.`;
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
  currentUserId,
  open,
  onOpenChange,
}: {
  /** The user filling the drawer, or null when nothing is selected. */
  user: AdminUserRow | null;
  offices: OfficeOption[];
  /** The signed-in admin — deleting yourself is refused, so it isn't offered. */
  currentUserId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateUserProfile, null);
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteUser, null);
  // The confirmation replaces the footer rather than opening a dialog on top of
  // the drawer: two stacked overlays fight over the focus trap, and one of them
  // usually takes the other down with it when it closes.
  const [confirming, setConfirming] = React.useState(false);
  const isSelf = user !== null && user.id === currentUserId;

  // Never carry a half-armed confirmation into another user, or back into this
  // one the next time it opens.
  React.useEffect(() => {
    setConfirming(false);
  }, [user?.id, open]);

  // Close the drawer once a save succeeds.
  React.useEffect(() => {
    if (state && "success" in state) {
      toast.success("User saved");
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  React.useEffect(() => {
    if (deleteState && "success" in deleteState) {
      toast.success("User deleted", {
        description: describeKept(deleteState.kept) ?? undefined,
      });
      onOpenChange(false);
      router.refresh();
    }
  }, [deleteState, onOpenChange, router]);

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

            <DrawerFooter className="flex-row items-center justify-end gap-2 border-t">
              {!isSelf && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive mr-auto"
                  onClick={() => setConfirming(true)}
                >
                  <Trash2 className="size-4" />
                  Delete user
                </Button>
              )}
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

        {/*
          Its own <form>, outside the one above — a nested form is invalid HTML,
          and a submit button inside that one would run the update action.
        */}
        {user && confirming && (
          <form action={deleteAction} className="border-t">
            <input type="hidden" name="id" value={user.id} />
            <div className="border-destructive/40 bg-destructive/5 m-4 rounded-md border px-4 py-3">
              <p className="text-destructive text-sm font-medium">
                Delete {user.email ?? "this user"}?
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Their sign-in account and profile go for good, and they lose
                access immediately. Orders they created and their entries in the
                system log stay — the practice&apos;s record of what happened is
                not theirs to take — but stop being linked to them.
              </p>
              {deleteState && "error" in deleteState ? (
                <p className="text-destructive mt-2 text-sm">{deleteState.error}</p>
              ) : null}
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirming(false)}
                  disabled={isDeleting}
                >
                  Keep user
                </Button>
                <Button type="submit" variant="destructive" size="sm" disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    "Delete permanently"
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  );
}
