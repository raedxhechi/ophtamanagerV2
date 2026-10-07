"use client";

import * as React from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { OfficeUserOption } from "./AdminDoctorOfficesData";

/**
 * The select's stand-in for "no default doctor" — Radix rejects an empty item
 * value. It never leaves this file: the hidden input submits it as empty, which
 * the action reads as null.
 */
const NONE = "__none__";

/**
 * The office's default doctor, picked from the doctors ticked in the user list.
 *
 * Only a doctor who works here is offered because only one is accepted — the
 * database refuses anyone else (see applyDefaultDoctor() in ../actions.ts).
 * Controlled, with the value going out through a hidden input, because the
 * options move as boxes are ticked: unticking the doctor who was picked takes
 * the pick with them, and ticking them again brings it back.
 */
export function DefaultDoctorField({
  users,
  members,
  defaultDoctorId,
  onEditDoctor,
}: {
  users: OfficeUserOption[];
  /** The ids ticked in the user list, live. */
  members: Set<string>;
  /** doctor_office.default_doctor_id as the drawer opened on it. */
  defaultDoctorId: string | null;
  /** Opens the doctor drawer on the one picked. */
  onEditDoctor: (doctorId: string) => void;
}) {
  const [picked, setPicked] = React.useState(defaultDoctorId ?? NONE);

  // In the user list's own order, which is by name.
  const doctors = users.filter(
    (user) => user.role === "doctor" && members.has(user.id)
  );
  const value = doctors.some((doctor) => doctor.id === picked) ? picked : NONE;

  return (
    <section className="grid gap-2">
      <Label htmlFor="default_doctor_id">Default doctor</Label>
      <input
        type="hidden"
        name="default_doctor_id"
        value={value === NONE ? "" : value}
      />
      <div className="flex items-center gap-2">
        <Select value={value} onValueChange={setPicked} disabled={!doctors.length}>
          <SelectTrigger id="default_doctor_id" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value={NONE}>No default doctor</SelectItem>
            {doctors.map((doctor) => (
              <SelectItem key={doctor.id} value={doctor.id}>
                {doctor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* type="button": inside the office form, a bare button submits it. */}
        <Button
          type="button"
          variant="outline"
          disabled={value === NONE}
          onClick={() => onEditDoctor(value)}
        >
          <Pencil className="size-4" />
          Edit
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        {doctors.length
          ? "One of the doctors ticked in the user list below."
          : "Tick a doctor in the user list below to choose one."}{" "}
        A doctor queued for an invitation can be chosen once the office is saved.
        Edit opens their name and Arzt-Nr., which save on their own.
      </p>
    </section>
  );
}
