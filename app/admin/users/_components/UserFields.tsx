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

/** "pharmacist" -> "Pharmacist" for the role select. */
function roleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * The profile fields, shared by the invite and edit drawers — they write the
 * same user_data columns and the two actions read the same field names.
 *
 * Everything is uncontrolled except the role, which is mirrored into state so
 * the office can say whether it is required: an admin works across every office
 * and needs none, while for everyone else the office decides what they can see.
 */
export function UserFields({
  offices,
  defaultRole,
  defaultOfficeId,
  defaultFirstName,
  defaultLastName,
}: {
  offices: OfficeOption[];
  defaultRole?: UserRole | null;
  defaultOfficeId?: string | null;
  defaultFirstName?: string | null;
  defaultLastName?: string | null;
}) {
  const [role, setRole] = React.useState<string>(defaultRole ?? "");
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
          Admins reach this area and every office&apos;s data. Everyone else is
          limited to the office below.
        </p>
      </section>

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
    </>
  );
}
