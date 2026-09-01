"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { AdminDoctorOfficeRow } from "./AdminDoctorOfficesData";

/**
 * How to reach the office and where it is. Uncontrolled inputs — the drawer
 * remounts this per office, so the defaults are re-seeded on their own.
 *
 * The name is not here: it is pinned in the drawer header, above the scroll, so
 * it stays readable while the rest of the form is scrolled. `pharmacy` is not
 * here either — a new office joins the default pharmacy on insert
 * (20260826150000_doctor_office_joins_default_pharmacy.sql) and moving one
 * between pharmacies is not something either screen offers.
 */
export function DoctorOfficeFields({
  office,
}: {
  /** The office being edited, or null when one is being created. */
  office: AdminDoctorOfficeRow | null;
}) {
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="contact_person">Contact person</Label>
          <Input
            id="contact_person"
            name="contact_person"
            defaultValue={office?.contact_person ?? ""}
            autoComplete="off"
            placeholder="Who to ask for"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone_number">Phone number</Label>
          <Input
            id="phone_number"
            name="phone_number"
            type="tel"
            defaultValue={office?.phone_number ?? ""}
            autoComplete="off"
          />
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={office?.email ?? ""}
            autoComplete="off"
            placeholder="praxis@example.de"
          />
          <p className="text-muted-foreground text-xs">
            The address the pharmacy writes to about this office&apos;s orders.
            It is not a sign-in — the people working here get their own accounts
            below.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div className="grid gap-2">
          <Label htmlFor="street">Street</Label>
          <Input
            id="street"
            name="street"
            defaultValue={office?.street ?? ""}
            autoComplete="off"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="house_number">House number</Label>
          <Input
            id="house_number"
            name="house_number"
            defaultValue={office?.house_number ?? ""}
            autoComplete="off"
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <div className="grid gap-2">
          <Label htmlFor="zipcode">Zipcode</Label>
          <Input
            id="zipcode"
            name="zipcode"
            defaultValue={office?.zipcode ?? ""}
            autoComplete="off"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            defaultValue={office?.city ?? ""}
            autoComplete="off"
          />
        </div>
      </section>
    </>
  );
}
