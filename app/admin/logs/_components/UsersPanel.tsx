"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { displayName, type LogUser, type OfficeOption } from "./types";
import { useAdminFilters } from "../../_components/useAdminFilters";

/** Sentinel for the "all offices" option — Radix Select rejects an empty value. */
const ALL_OFFICES = "__all__";

/**
 * The people the log covers, filterable by doctor office. Picking someone
 * scopes the log beside it to their activity; picking their office scopes it to
 * everyone in that office.
 *
 * The office filter drives both panes: it narrows this list *and* the log, so
 * the two never disagree about who is being looked at.
 */
export function UsersPanel({
  users,
  offices,
  selectedOffice,
  selectedUser,
}: {
  users: LogUser[];
  offices: OfficeOption[];
  selectedOffice: string;
  selectedUser: string;
}) {
  const { setFilters } = useAdminFilters();

  // Filtering the loaded list on the client: this is the office's staff, tens
  // of rows, so a round-trip per keystroke would buy nothing.
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [displayName(user), user.email, user.doctor_office?.name]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term))
    );
  }, [users, query]);

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-72">
      <Select
        value={selectedOffice || ALL_OFFICES}
        onValueChange={(value) =>
          // Changing office clears the selected user: keeping a user from the
          // previous office would show an empty log with no visible reason.
          setFilters({
            office: value === ALL_OFFICES ? null : value,
            user: null,
          })
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All doctor offices" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_OFFICES}>All doctor offices</SelectItem>
          {offices.map((office) => (
            <SelectItem key={office.id} value={office.id}>
              {office.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Find a user…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="h-9"
      />

      <div className="flex max-h-[60vh] flex-col overflow-y-auto rounded-lg border">
        <button
          type="button"
          onClick={() => setFilters({ user: null })}
          className={cn(
            "border-b px-3 py-2.5 text-left text-sm transition-colors",
            "hover:bg-accent",
            !selectedUser && "bg-accent font-medium"
          )}
        >
          All users
        </button>

        {filtered.map((user) => {
          const isSelected = selectedUser === user.id;
          return (
            <button
              key={user.id}
              type="button"
              onClick={() => setFilters({ user: isSelected ? null : user.id })}
              className={cn(
                "flex flex-col gap-0.5 border-b px-3 py-2 text-left transition-colors last:border-b-0",
                "hover:bg-accent",
                isSelected && "bg-accent"
              )}
            >
              <span
                className={cn("truncate text-sm", isSelected && "font-medium")}
              >
                {displayName(user)}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {user.doctor_office?.name ?? "No office"} · {user.role}
              </span>
            </button>
          );
        })}

        {!filtered.length && (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm">
            No users match.
          </p>
        )}
      </div>
    </aside>
  );
}
