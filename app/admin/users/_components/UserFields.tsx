"use client";

import * as React from "react";

import { Constants } from "@/types/supabase";
import type { UserRole } from "@/types/user";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { OfficeOption } from "../../_components/OfficeFilter";
import { NO_OFFICE } from "./officeSelect";
import { OfficeAccessField } from "./OfficeAccessField";

/** "pharmacist" -> "Pharmacist" for the role select. */
function roleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * The profile fields, shared by the invite and edit drawers — they write the
 * same user_data columns and the two actions read the same field names.
 *
 * Everything is uncontrolled except the role, which is mirrored into state
 * because it decides what the office field even is: an admin works across every
 * office and needs none, a manager holds a *set* of them, and everyone else has
 * exactly one that is also the whole of their access.
 */
export function UserFields({
  offices,
  defaultRole,
  defaultOfficeId,
  defaultOfficeIds,
  defaultFirstName,
  defaultLastName,
}: {
  offices: OfficeOption[];
  defaultRole?: UserRole | null;
  /** The active office: user_data.doctor_office_id. */
  defaultOfficeId?: string | null;
  /** The access set: public.user_office_access. Empty for a new invitation. */
  defaultOfficeIds?: string[];
  defaultFirstName?: string | null;
  defaultLastName?: string | null;
}) {
  const [role, setRole] = React.useState<string>(defaultRole ?? "");

  // Held here rather than inside OfficeAccessField so that flipping the role
  // away from manager and back doesn't throw away what the admin had ticked —
  // the field unmounts with every such flip, this component does not.
  //
  // Seeded from the access set, falling back to the active office: that is what
  // a doctor being promoted to manager already has, and it means the office
  // they were in stays ticked instead of the list opening empty.
  const [officeIds, setOfficeIds] = React.useState<string[]>(() => {
    const seed = defaultOfficeIds?.length
      ? defaultOfficeIds
      : defaultOfficeId
        ? [defaultOfficeId]
        : [];
    const seeded = new Set(seed);
    // In `offices` order, which is the order the hidden inputs go out in.
    return offices.filter((office) => seeded.has(office.id)).map((o) => o.id);
  });

  const isManager = role === "manager";
  const officeRequired = role !== "admin";

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="first_name">First name</Label>
          <Input
            id="first_name"
            name="first_name"
            defaultValue={defaultFirstName ?? ""}
            autoComplete="off"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="last_name">Last name</Label>
          <Input
            id="last_name"
            name="last_name"
            defaultValue={defaultLastName ?? ""}
            autoComplete="off"
          />
        </div>
      </section>

      <section className="grid gap-2">
        <Label htmlFor="role">
          Role <span className="text-destructive">*</span>
        </Label>
        <Select
          name="role"
          required
          defaultValue={defaultRole ?? undefined}
          onValueChange={setRole}
        >
          <SelectTrigger id="role" className="w-full">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {Constants.public.Enums.user_role.map((value) => (
              <SelectItem key={value} value={value}>
                {roleLabel(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Admins reach this area and every office&apos;s data. A manager works
          across several offices at once and may correct the orders in them.
          Everyone else is limited to the one office below.
        </p>
      </section>

      {isManager ? (
        <OfficeAccessField
          offices={offices}
          selected={officeIds}
          onChange={setOfficeIds}
          activeOfficeId={defaultOfficeId ?? null}
        />
      ) : (
        <section className="grid gap-2">
          <Label htmlFor="doctor_office_id">
            Doctor office{" "}
            {officeRequired && <span className="text-destructive">*</span>}
          </Label>
          <Select
            name="doctor_office_id"
            defaultValue={defaultOfficeId ?? (role === "admin" ? NO_OFFICE : undefined)}
          >
            <SelectTrigger id="doctor_office_id" className="w-full">
              <SelectValue placeholder="Select a doctor office" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value={NO_OFFICE}>No office</SelectItem>
              {offices.map((office) => (
                <SelectItem key={office.id} value={office.id}>
                  {office.name ?? "Unnamed office"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!officeRequired && (
            <p className="text-muted-foreground text-xs">
              Optional for an admin — they see every office either way.
            </p>
          )}
        </section>
      )}
    </>
  );
}
