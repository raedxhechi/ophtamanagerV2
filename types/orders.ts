import type { Database, TablesInsert } from "./supabase";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type SuborderRow = Database["public"]["Tables"]["suborders"]["Row"];
type PatientRow = Database["public"]["Tables"]["patients"]["Row"];
type MedicineRow = Database["public"]["Tables"]["medicine"]["Row"];
type InsuranceCompanyRow =
  Database["public"]["Tables"]["insurance_companies"]["Row"];

/**
 * An order with the relations the create/draft form reads: its medicine and
 * each suborder's patient (+ that patient's insurance company). Matches the
 * embedded shape returned by the order queries in api/browser.
 */
export type DraftOrder = OrderRow & {
  medicine: MedicineRow;
  subOrders: (SuborderRow & {
    patient: PatientRow & { insurance_companies: InsuranceCompanyRow | null };
  })[];
};

/**
 * Payload for creating an order together with its suborders.
 *
 * Built from the Supabase Insert types: the order's own columns (minus the
 * server-managed id/timestamps — `doctor_office_id` is optional since the DB
 * defaults it to current_office_id()), plus the suborders to create. Each
 * suborder omits `order_id`, which is filled in once the parent order exists.
 */
export type CreateOrderInput = Omit<
  TablesInsert<"orders">,
  "id" | "created_at" | "updated_at"
> & {
  subOrders: SubOrderInput[];
};

/** A single suborder within a CreateOrderInput (order_id is set server-side). */
export type SubOrderInput = Omit<
  TablesInsert<"suborders">,
  "id" | "created_at" | "updated_at" | "order_id"
>;
