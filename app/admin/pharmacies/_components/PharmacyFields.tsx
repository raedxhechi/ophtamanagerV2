"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { AdminPharmacyRow, PharmacyOfficeOption } from "./AdminPharmaciesData";

/**
 * Everything an admin can change about a pharmacy. Uncontrolled inputs, except
 * the two things that are not plain text: the default flag and the set of
 * offices, both of which submit hidden inputs so the drawer's plain <form>
 * carries them.
 */
export function PharmacyFields({
  pharmacy,
  offices,
}: {
  pharmacy: AdminPharmacyRow;
  /** Every doctor office, with the pharmacy each is attached to today. */
  offices: PharmacyOfficeOption[];
}) {
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={pharmacy.name}
            autoComplete="off"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="contact_person">Contact person</Label>
          <Input
            id="contact_person"
            name="contact_person"
            defaultValue={pharmacy.contact_person ?? ""}
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
            defaultValue={pharmacy.phone_number ?? ""}
            autoComplete="off"
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div className="grid gap-2">
          <Label htmlFor="street">Street</Label>
          <Input
            id="street"
            name="street"
            defaultValue={pharmacy.street ?? ""}
            autoComplete="off"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="house_number">House number</Label>
          <Input
            id="house_number"
            name="house_number"
            defaultValue={pharmacy.house_number ?? ""}
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
            defaultValue={pharmacy.zipcode ?? ""}
            autoComplete="off"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            defaultValue={pharmacy.city ?? ""}
            autoComplete="off"
          />
        </div>
      </section>

      <DefaultPharmacyField isDefault={pharmacy.default_pharmacy} />

      <PharmacyOfficesField pharmacyId={pharmacy.id} offices={offices} />
    </>
  );
}

/**
 * The "this is the default pharmacy" flag.
 *
 * Only ever offered as a way to turn it *on*: the row that already holds it
 * shows it locked, because unticking it would leave the project with no default
 * at all, and the screen that stands in for creating a pharmacy points people at
 * "the default pharmacy" by name. Moving it is done from the pharmacy taking it
 * over, and the database clears the old one in the same statement.
 */
function DefaultPharmacyField({ isDefault }: { isDefault: boolean }) {
  const [checked, setChecked] = React.useState(isDefault);

  return (
    <section className="rounded-md border px-3 py-3">
      <div className="flex items-start gap-3">
        <Checkbox
          id="default_pharmacy"
          checked={checked}
          disabled={isDefault}
          onCheckedChange={(value) => setChecked(value === true)}
          className="mt-0.5"
        />
        {/* The value the action reads. Rendered only when the box is ticked and
            the row is not already the default — a disabled checkbox submits
            nothing, and the action keeps the flag as it found it. */}
        {checked && !isDefault ? (
          <input type="hidden" name="default_pharmacy" value="on" />
        ) : null}
        <div className="grid gap-1">
          <Label htmlFor="default_pharmacy" className="cursor-pointer font-medium">
            Default pharmacy
          </Label>
          <p className="text-muted-foreground text-xs">
            {isDefault
              ? "This is the default pharmacy. To move the default, open another pharmacy and mark it there — it takes over, and this one stops being the default."
              : "Makes this the pharmacy the app falls back to. Only one can hold it, so marking this one takes it from whichever holds it now."}
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * The offices this pharmacy serves — shown, not edited.
 *
 * The link lives on doctor_office (`pharmacy_id`), one pharmacy to many offices,
 * and it is no longer anybody's decision: a new office joins the default
 * pharmacy on insert (see
 * 20260826150000_doctor_office_joins_default_pharmacy.sql), which is why the
 * boxes are ticked but disabled. Unticking one would leave an office with no
 * pharmacy at all and its orders with no recipient on the receipt, so the drawer
 * does not offer it — and nothing here submits a value, so a save cannot change
 * the assignment either.
 *
 * Every office is listed, not just the served ones: an office attached to a
 * different pharmacy says which, so this reads as the full picture rather than
 * as a list that quietly leaves some out.
 */
function PharmacyOfficesField({
  pharmacyId,
  offices,
}: {
  pharmacyId: string;
  offices: PharmacyOfficeOption[];
}) {
  const served = offices.filter((office) => office.pharmacy_id === pharmacyId);

  return (
    <section className="grid gap-2">
      <Label>Doctor offices served</Label>

      <div className="max-h-64 overflow-y-auto rounded-md border py-1">
        {offices.length ? (
          offices.map((office) => {
            const isServed = office.pharmacy_id === pharmacyId;

            return (
              <div key={office.id} className="flex items-center gap-3 px-3 py-2">
                <Checkbox
                  checked={isServed}
                  disabled
                  aria-label={
                    isServed
                      ? `${office.name ?? "Unnamed office"} is served by this pharmacy`
                      : `${office.name ?? "Unnamed office"} is not served by this pharmacy`
                  }
                />
                <span
                  className={
                    isServed
                      ? "flex-1 truncate text-sm"
                      : "text-muted-foreground flex-1 truncate text-sm"
                  }
                >
                  {office.name ?? "Unnamed office"}
                </span>
                {office.pharmacy_id !== null && !isServed ? (
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {office.pharmacy_name ?? "Another pharmacy"}
                  </Badge>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm">
            There are no doctor offices yet.
          </p>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        {served.length
          ? `${served.length} of ${offices.length} office${offices.length === 1 ? "" : "s"} served.`
          : "No office is served by this pharmacy."}{" "}
        Assigned automatically — a doctor office joins the default pharmacy when
        it is created, so there is nothing to tick here.
      </p>
    </section>
  );
}
