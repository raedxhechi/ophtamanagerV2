"use client";

import * as React from "react";
import { UserPlus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import type { OfficeUserOption } from "./AdminDoctorOfficesData";
import { PENDING_USERS_FIELD, type PendingUser } from "./pendingUsers";

/**
 * Whether a user who is in this office today can be taken out of it *from here*.
 *
 * The asymmetry is the roles, not the screen (see "Multi-office access" in
 * context.md). An admin reaches every office and needs none of their own; a
 * manager holds a set and can spare one as long as they keep another. For a
 * doctor, assistant or pharmacist the office *is* their access — removing it
 * leaves them signed in and looking at nothing — so they are moved instead, by
 * ticking them into the office they are moving to.
 *
 * The action refuses the same two cases, so this only decides whether the
 * checkbox is offered or explained.
 */
function canUnassign(user: OfficeUserOption, officeId: string): string | null {
  if (user.role === "admin") return null;
  if (user.role === "manager") {
    return user.officeIds.filter((id) => id !== officeId).length
      ? null
      : "This is their only office, and a manager needs at least one.";
  }
  return `A ${user.role} works in exactly one office. To move them, open the office they are moving to and tick them there.`;
}

/** What ticking this user will actually do, in a sentence. */
function assignmentHint(user: OfficeUserOption, officeId: string): string | null {
  if (user.role === "manager") {
    return user.officeIds.includes(officeId)
      ? null
      : "Adds this office to the ones they cover.";
  }
  return user.activeOfficeId && user.activeOfficeId !== officeId
    ? "Moves them out of their current office."
    : null;
}

/**
 * Who works in this office: the accounts that already exist, and the doctors
 * queued up to be invited into it.
 *
 * The ticked set submits `member_ids`, which the save action diffs against what
 * the database says today — so an unchanged list writes nothing. The queue
 * submits one `pending_users` input per row and is sent only after the office
 * has an id (see ./pendingUsers and ../actions.ts).
 */
export function OfficeUsersField({
  officeId,
  users,
  pending,
  onInvite,
  onRemovePending,
}: {
  /** The office being edited, or null while one is being created. */
  officeId: string | null;
  users: OfficeUserOption[];
  pending: PendingUser[];
  /** Opens the nested drawer that queues one more doctor. */
  onInvite: () => void;
  onRemovePending: (key: string) => void;
}) {
  // Who is in this office right now, frozen at mount. The lock below is keyed
  // off *this* rather than off the live checkbox, so ticking a doctor and
  // changing your mind before saving is undoing a local change, not the removal
  // the roles refuse.
  const initialMembers = React.useMemo(
    () =>
      new Set(
        officeId
          ? users
              .filter(
                (user) =>
                  user.activeOfficeId === officeId ||
                  user.officeIds.includes(officeId)
              )
              .map((user) => user.id)
          : []
      ),
    [users, officeId]
  );

  const [selected, setSelected] = React.useState<Set<string>>(initialMembers);

  // Members first, then everyone else — each half in the list's own order, which
  // is by name. Computed once: re-sorting as boxes are ticked would make rows
  // jump out from under the pointer.
  const ordered = React.useMemo(
    () =>
      [...users].sort((a, b) => {
        const memberA = initialMembers.has(a.id) ? 0 : 1;
        const memberB = initialMembers.has(b.id) ? 0 : 1;
        return memberA - memberB || a.name.localeCompare(b.name);
      }),
    [users, initialMembers]
  );

  const toggle = (id: string, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <section className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Users in this office</Label>
        <Button type="button" variant="outline" size="sm" onClick={onInvite}>
          <UserPlus className="size-4" />
          New user
        </Button>
      </div>

      {pending.length > 0 && (
        <ul className="grid gap-1 rounded-md border border-dashed px-3 py-2">
          {pending.map((user) => (
            <li key={user.key} className="flex items-center gap-3 py-1">
              {/* The queue itself, one input per row so a row stays whole. */}
              <input
                type="hidden"
                name={PENDING_USERS_FIELD}
                value={JSON.stringify(user)}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {[user.first_name, user.last_name].filter(Boolean).join(" ") ||
                    user.email}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {user.email}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                Doctor
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={() => onRemovePending(user.key)}
                aria-label={`Remove ${user.email} from the invitations`}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
          <li className="text-muted-foreground pt-1 text-xs">
            {pending.length} invitation{pending.length === 1 ? "" : "s"} will be
            sent when you save
            {officeId ? "." : ", once the office exists."}
          </li>
        </ul>
      )}

      <div className="max-h-72 overflow-y-auto rounded-md border py-1">
        {ordered.length ? (
          ordered.map((user) => {
            const checked = selected.has(user.id);
            const lockedReason = initialMembers.has(user.id)
              ? canUnassign(user, officeId ?? "")
              : null;
            const hint = checked ? null : assignmentHint(user, officeId ?? "");

            return (
              <div key={user.id} className="flex items-start gap-3 px-3 py-2">
                <Checkbox
                  id={`member-${user.id}`}
                  checked={checked}
                  disabled={lockedReason !== null}
                  onCheckedChange={(value) => toggle(user.id, value === true)}
                  className="mt-0.5"
                />
                {/* Only the ticked ones go out; the action reads them as the
                    office's whole list and diffs against what it finds. */}
                {checked && (
                  <input type="hidden" name="member_ids" value={user.id} />
                )}
                <div className="min-w-0 flex-1">
                  <Label
                    htmlFor={`member-${user.id}`}
                    className={
                      lockedReason
                        ? "block truncate text-sm"
                        : "block cursor-pointer truncate text-sm"
                    }
                  >
                    {user.name}
                  </Label>
                  <p className="text-muted-foreground truncate text-xs">
                    {user.email ?? "No email"}
                  </p>
                  {(lockedReason ?? hint) && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {lockedReason ?? hint}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge variant="outline" className="capitalize">
                    {user.role}
                  </Badge>
                  {/* Where they are today, when that is somewhere else — so
                      ticking reads as moving them rather than as a fresh
                      assignment. */}
                  {user.activeOfficeName &&
                  user.activeOfficeId !== officeId ? (
                    <Badge variant="secondary" className="max-w-40 truncate">
                      {user.activeOfficeName}
                    </Badge>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm">
            There are no user accounts yet.
          </p>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        {selected.size
          ? `${selected.size} of ${users.length} user${users.length === 1 ? "" : "s"} assigned.`
          : "Nobody is assigned to this office."}{" "}
        Ticking a doctor, assistant or pharmacist moves them here from wherever
        they are now; a manager keeps the offices they already cover.
      </p>
    </section>
  );
}
