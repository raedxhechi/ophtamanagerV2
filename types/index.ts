import type { Database } from "./supabase";

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------
export * from "./orders";
export * from "./draftOrders";

// ---------------------------------------------------------------------------
// Table row types
// ---------------------------------------------------------------------------
export type DoctorOffice = Database["public"]["Tables"]["doctor_office"]["Row"];
export type Patient = Database["public"]["Tables"]["patients"]["Row"];
export type Medicine = Database["public"]["Tables"]["medicine"]["Row"];
export type InsuranceCompany =
  Database["public"]["Tables"]["insurance_companies"]["Row"];
export type InsurancePolicy =
  Database["public"]["Tables"]["insurance_policy"]["Row"];
export type InsurancePolicyMedicine =
  Database["public"]["Tables"]["insurance_policy_medicines"]["Row"];
export type InsurancePolicyInsuranceCompany =
  Database["public"]["Tables"]["insurance_policy_insurance_companies"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type Suborder = Database["public"]["Tables"]["suborders"]["Row"];
export type UserData = Database["public"]["Tables"]["user_data"]["Row"];

// ---------------------------------------------------------------------------
// Relation types (shapes returned by embedded selects in api/browser)
// ---------------------------------------------------------------------------
// A policy with its linked medicines and insurance companies nested through the
// two junction tables — how Supabase returns the `listPolicies` embed. (Replaces
// the old Directus `insuranceCompanies_id` / `medicines_id` nesting.)
export type InsurancePolicyWithRelations = InsurancePolicy & {
  insurance_policy_medicines: { medicine: Medicine }[];
  insurance_policy_insurance_companies: {
    insurance_companies: InsuranceCompany;
  }[];
};

// A patient with its insurance company joined in (the `insurance_companies (*)`
// embed used by the patient picker / order form).
export type PatientWithInsuranceCompany = Patient & {
  insurance_companies: InsuranceCompany | null;
};

// ---------------------------------------------------------------------------
// Enum types
// ---------------------------------------------------------------------------
export type Gender = Database["public"]["Enums"]["gender"];
export type InsuranceType = Database["public"]["Enums"]["insurance_type"];
export type InvoiceType = Database["public"]["Enums"]["invoice_types"];
export type MedicineType = Database["public"]["Enums"]["medicine_type"];
export type UserRole = Database["public"]["Enums"]["user_role"];
