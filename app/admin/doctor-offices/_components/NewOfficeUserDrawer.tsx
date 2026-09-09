"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import type { PendingUser } from "./pendingUsers";

/** The same loose check the invite form uses — a typo, not a spec. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * "New user", opened from inside the office drawer and sitting on top of it.
 *
 * A Sheet rather than a second Drawer. Both are a right-hand panel and look the
 * same, but vaul manages `document.body` itself for its scroll lock, and a
 * second vaul root closing while the first is still open restores the body it
 * found rather than the one underneath it. Radix's dialog — which Sheet is —
 * keeps a stack for exactly this, so the office drawer is still there and still
 * scroll-locked when this closes over it.
 *
 * It does not talk to the server. Filling it in adds a row to the office
 * drawer's queue, and the invitation goes out when that drawer is saved — which
 * is the only order available while the office is still being created, and the
 * one that keeps Cancel meaning cancel once it isn't. See ./pendingUsers.
 */
export function NewOfficeUserDrawer({
  officeName,
  open,
  onOpenChange,
  onQueue,
}: {
  /** The office they will join — its name as typed, which may not be saved yet. */
  officeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQueue: (user: Omit<PendingUser, "key">) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="!w-[34vw] !max-w-[34vw] gap-0 p-0"
        // The office drawer beneath is a focus-trapping overlay of its own, and
        // a click that lands on it while this is open would otherwise close this
        // and press whatever was underneath in one go.
        onInteractOutside={(event) => event.preventDefault()}
      >
        {/* Keyed on `open` so each visit starts on empty fields rather than on
            the last doctor that was queued. */}
        <NewOfficeUserForm
          key={String(open)}
          officeName={officeName}
          onQueue={onQueue}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

function NewOfficeUserForm({
  officeName,
  onQueue,
  onClose,
}: {
  officeName: string;
  onQueue: (user: Omit<PendingUser, "key">) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // A real <form> so Enter submits, and safe to nest: both this and the office
  // drawer render through a portal into document.body, so neither is inside the
  // other's DOM however the JSX reads.
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const address = email.trim().toLowerCase();
    if (!EMAIL.test(address)) {
      setError("Enter a valid email address.");
      return;
    }

    onQueue({
      email: address,
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="border-b">
        <SheetTitle>New user</SheetTitle>
        <SheetDescription>
          They get an email with a link to choose a password, and land in{" "}
          {officeName.trim() || "this office"} as a doctor.
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <section className="grid gap-2">
          <Label htmlFor="new_user_email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="new_user_email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
            autoComplete="off"
            placeholder="name@praxis.de"
          />
          <p className="text-muted-foreground text-xs">
            The address the invitation goes to, and the one they sign in with.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="new_user_first_name">First name</Label>
            <Input
              id="new_user_first_name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new_user_last_name">Last name</Label>
            <Input
              id="new_user_last_name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              autoComplete="off"
            />
          </div>
        </section>

        {/* No role picker: an office's users are the people working in it, and
            this screen only ever creates doctors. Anything else — a manager
            across several offices, another admin — is set on /admin/users. */}
        <section className="rounded-md border px-3 py-3">
          <p className="text-sm font-medium">Doctor</p>
          <p className="text-muted-foreground mt-1 text-xs">
            The only role this screen creates. They will see the patients and
            orders of this office and nothing else. To make someone a manager or
            an admin, invite them on the users screen instead.
          </p>
        </section>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </div>

      <SheetFooter className="flex-row justify-end gap-2 border-t">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Add user</Button>
      </SheetFooter>
    </form>
  );
}
