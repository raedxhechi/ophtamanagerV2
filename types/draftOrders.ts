import type { Database, TablesInsert } from "./supabase";

type DraftOrderRow = Database["public"]["Tables"]["draft_orders"]["Row"];
type DraftSuborderRow = Database["public"]["Tables"]["draft_suborders"]["Row"];
type PatientRow = Database["public"]["Tables"]["patients"]["Row"];
type MedicineRow = Database["public"]["Tables"]["medicine"]["Row"];
type InsuranceCompanyRow =
  Database["public"]["Tables"]["insurance_companies"]["Row"];

/** A patient with its insurance company, as embedded in draft order queries. */
type PatientWithInsurance = PatientRow & {
  insurance_companies: InsuranceCompanyRow | null;
};

/**
 * A draft suborder as embedded inside a draft order: the row plus its patient.
 * Matches the embed `draft_suborders(*, patient:patients(*, insurance_companies(*)))`.
 * Unlike a real suborder, only `patient_id` is guaranteed — the eyes and the
 * invoice type may still be undecided.
 */
export type DraftSubOrder = DraftSuborderRow & {
  patient: PatientWithInsurance;
};

/**
 * A draft order with the relations the draft list and the create-order form
 * read: its medicine (nullable — a draft may not have one picked yet) and each
 * suborder with its patient (+ that patient's insurance company).
 *
 * The suborders come back under the `subOrders` key: the queries in
 * api/browser/draftOrders.ts alias the relation (`subOrders:draft_suborders`).
 */
export type DraftOrder = DraftOrderRow & {
  medicine: MedicineRow | null;
  subOrders: DraftSubOrder[];
};

/**
 * Payload for creating (or replacing the contents of) a draft order together
 * with its suborders. Everything except each suborder's `patient_id` is
 * optional, which is the whole point of a draft: it holds whatever the form had
 * when the user parked it.
 */
export type CreateDraftOrderInput = Omit<
  TablesInsert<"draft_orders">,
  "id" | "created_at" | "updated_at"
> & {
  subOrders: DraftSubOrderInput[];
};

/** A single suborder within a draft (draft_order_id is set server-side). */
export type DraftSubOrderInput = Omit<
  TablesInsert<"draft_suborders">,
  "id" | "created_at" | "updated_at" | "draft_order_id"
>;
