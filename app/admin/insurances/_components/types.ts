import type { Database } from "@/types/supabase";

export type InsuranceType = Database["public"]["Enums"]["insurance_type"];

/** A medicine as both the overview's right column and the drawer show one. */
export type MedicineItem = {
  id: string;
  name: string;
  medicine_type: string;
  background_color: string | null;
  text_color: string | null;
};

/**
 * A policy under the office it belongs to, as the overview's middle column
 * lists it.
 *
 * `label` is the office's own numbering — "Policy 2" — taken from
 * /admin/policies rather than invented here, so a policy is called the same
 * thing on both screens.
 */
export type OverviewPolicy = {
  id: string;
  label: string;
  medicineIds: string[];
};

/**
 * A doctor office a company reaches, with every policy that makes the link.
 * More than one is the case the middle column expands into checkboxes: the
 * office is connected twice over, and which of the two you mean changes the
 * medicines on the right.
 */
export type OverviewOffice = {
  /** The office's id, or `UNASSIGNED_OFFICE_KEY` for policies attached to none. */
  key: string;
  name: string;
  policies: OverviewPolicy[];
};

/**
 * `insurance_policy.doctor_office_id` is nullable, so a policy can name a
 * company while belonging to no office. Those are grouped under one pseudo
 * office rather than dropped — a company linked only through an unassigned
 * policy would otherwise read as linked to nothing at all.
 */
export const UNASSIGNED_OFFICE_KEY = "__no_office__";

/** An insurance company with everything both tabs read off it. */
export type AdminInsuranceCompanyRow = {
  id: string;
  name: string;
  insurance_type: InsuranceType;
  iknumber: string | null;
  created_at: string;
  updated_at: string;
  /** The offices this company is linked to through policies, by name. */
  offices: OverviewOffice[];
  /** How many policies name this company, across every office. */
  policyCount: number;
};

/** "Privat" -> "P", "Gesetzlich" -> "G" — the badge in the table and the list. */
export function insuranceTypeInitial(type: InsuranceType): string {
  return type === "Privat" ? "P" : "G";
}

/** The long name behind that letter, for a tooltip and for the table's filter. */
export function insuranceTypeLabel(type: InsuranceType): string {
  return type === "Privat" ? "Privat (PKV)" : "Gesetzlich (GKV)";
}
