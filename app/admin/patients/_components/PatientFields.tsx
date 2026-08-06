"use client";

import { useListInsuranceCompanies } from "@/react-query/insurance-companies";
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
import type { AdminPatientRow } from "./AdminPatientsData";

/** ISO date input needs a yyyy-mm-dd value; strip any time component. */
function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

/**
 * The patient form fields, shared by the add and edit drawers — they write the
 * same columns, and the two actions read the same field names.
 *
 * Everything is uncontrolled; the drawers key their `<form>` so the defaults
 * re-seed when a different patient is opened.
 */
export function PatientFields({
  patient,
  offices,
  defaultOfficeId,
}: {
  /** Seeds the defaults when editing; omitted when adding. */
  patient?: AdminPatientRow | null;
  /**
   * Offices for the doctor-office select. Only the add form passes them —
   * moving an existing patient between offices would strand the suborders
   * hanging off their old office's orders, so editing shows it read-only.
   */
  offices?: OfficeOption[];
  /** Preselected office, e.g. the one the list is currently filtered to. */
  defaultOfficeId?: string;
}) {
  const { data: companies, isLoading: companiesLoading } =
    useListInsuranceCompanies();

  return (
    <>
      {offices && (
        <section className="grid gap-2">
          <Label htmlFor="doctor_office_id">
            Doctor office <span className="text-destructive">*</span>
          </Label>
          <Select
            name="doctor_office_id"
            required
            defaultValue={defaultOfficeId || undefined}
          >
            <SelectTrigger id="doctor_office_id" className="w-full">
              <SelectValue placeholder="Select a doctor office" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {offices.map((office) => (
                <SelectItem key={office.id} value={office.id}>
                  {office.name ?? "Unnamed office"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>
      )}

      {/* Personal details */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="last_name">
            Last name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="last_name"
            name="last_name"
            defaultValue={patient?.last_name ?? ""}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="first_name">
            First name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="first_name"
            name="first_name"
            defaultValue={patient?.first_name ?? ""}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="date_of_birth">
            Date of birth <span className="text-destructive">*</span>
          </Label>
          <Input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            defaultValue={toDateInputValue(patient?.date_of_birth)}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="gender">Gender</Label>
          <Select name="gender" defaultValue={patient?.gender ?? undefined}>
            <SelectTrigger id="gender" className="w-full">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">male</SelectItem>
              <SelectItem value="female">female</SelectItem>
              <SelectItem value="other">other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Insurance */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="insurance_company_id">Insurance company</Label>
          <Select
            name="insurance_company_id"
            defaultValue={patient?.insurance_company_id ?? undefined}
            disabled={companiesLoading}
          >
            <SelectTrigger id="insurance_company_id" className="w-full">
              <SelectValue placeholder={companiesLoading ? "Loading…" : "—"} />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {companies?.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="insurance_number">Insurance number</Label>
          <Input
            id="insurance_number"
            name="insurance_number"
            defaultValue={patient?.insurance_number ?? ""}
          />
        </div>
      </section>

      {/* Address */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="street">Street</Label>
          <Input id="street" name="street" defaultValue={patient?.street ?? ""} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="house_number">House number</Label>
          <Input
            id="house_number"
            name="house_number"
            defaultValue={patient?.house_number ?? ""}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="zipcode">Zipcode</Label>
          <Input
            id="zipcode"
            name="zipcode"
            defaultValue={patient?.zipcode ?? ""}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={patient?.city ?? ""} />
        </div>
      </section>
    </>
  );
}
