"use client";

import * as React from "react";
import { UserPlus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import type { OfficeUserOption } from "./AdminDoctorOfficesData";
import { PENDING_USERS_FIELD, type PendingUser } from "./pendingUsers";

/**
 * Who is in this office today: whoever has it as their active office, and every
 * manager it is granted to. Empty for an office still being created.
 */
export function officeMemberIds(
  users: OfficeUserOption[],
  officeId: string | null
): Set<string> {
  return new Set(
    officeId
      ? users
          .filter(
            (user) =>
              user.activeOfficeId === officeId ||
              user.officeIds.includes(officeId)
          )
          .map((user) => user.id)
      : []
  );
}

/**
 * Who works in this office: the accounts that already exist, and the doctors
 * queued up to be invited into it.
 *
 * A read-only list. Moving people between offices is a role-dependent write —
 * a grant for a manager, a move for everyone else, and refused outright for the
 * last office a doctor has — and it belongs to the account, so it is done on
 * /admin/users. Nothing here submits `member_ids`, which is what tells the save
 * action to leave membership alone (see applyMembership() in ../actions.ts).
 *
 * The queue is the one thing this field still writes: it submits one
 * `pending_users` input per row, sent only after the office has an id (see
 * ./pendingUsers and ../actions.ts).
 */
export function OfficeUsersField({
  officeId,
  users,
  members,
  pending,
  onInvite,
  onRemovePending,
}: {
  /** The office being edited, or null while one is being created. */
  officeId: string | null;
  users: OfficeUserOption[];
  /** The office's members — officeMemberIds(), as the drawer computed them. */
  members: Set<string>;
  pending: PendingUser[];
  /** Opens the nested drawer that queues one more doctor. */
  onInvite: () => void;
  onRemovePending: (key: string) => void;
}) {
  // Only this office's people, in the list's own order (by name). Everyone else
  // used to be here to be ticked in; with nothing to tick, they are somebody
  // else's office's business.
  const ordered = React.useMemo(
    () => users.filter((user) => members.has(user.id)),
    [users, members]
  );

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
          ordered.map((user) => (
            <div key={user.id} className="flex items-start gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{user.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {user.email ?? "No email"}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 capitalize">
                {user.role}
              </Badge>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm">
            {officeId
              ? "Nobody works in this office yet."
              : "Invite the first doctor with New user above."}
          </p>
        )}
      </div>
    </section>
  );
}
