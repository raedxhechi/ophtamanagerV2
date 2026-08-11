"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type OfficeOption = { id: string; name: string | null };

/** Sentinel for "no office filter" — Radix rejects an empty item value. */
const ALL_OFFICES = "__all__";

/**
 * The doctor-office filter shared by the admin list pages. Admins see every
 * office's rows by default, so "All offices" is a real choice rather than an
 * empty state, and the value maps to the absence of the `office` param.
 */
export function OfficeFilter({
  offices,
  value,
  onChange,
  className,
}: {
  offices: OfficeOption[];
  /** The selected office id, or "" for all offices. */
  value: string;
  /** Called with the new office id, or null when "All offices" is picked. */
  onChange: (officeId: string | null) => void;
  className?: string;
}) {
  return (
    <Select
      value={value || ALL_OFFICES}
      onValueChange={(next) => onChange(next === ALL_OFFICES ? null : next)}
    >
      <SelectTrigger className={className ?? "h-9 w-56"} aria-label="Doctor office">
        <SelectValue placeholder="All offices" />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        <SelectItem value={ALL_OFFICES}>All offices</SelectItem>
        {offices.map((office) => (
          <SelectItem key={office.id} value={office.id}>
            {office.name ?? "Unnamed office"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
