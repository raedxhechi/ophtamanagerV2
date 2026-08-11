import type { Database, TablesInsert } from "./supabase";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type SuborderRow = Database["public"]["Tables"]["suborders"]["Row"];
type PatientRow = Database["public"]["Tables"]["patients"]["Row"];
type MedicineRow = Database["public"]["Tables"]["medicine"]["Row"];
type InsuranceCompanyRow =
  Database["public"]["Tables"]["insurance_companies"]["Row"];
type UserDataRow = Database["public"]["Tables"]["user_data"]["Row"];
// The email/first_name/last_name columns were added by migration; the generated
// types/supabase.ts may lag behind until `npm run typegen` is re-run, so they're
// spelled out here to keep the creator embed typed. The intersection is a no-op
// once the generated row already includes them.
type CreatedByUser = UserDataRow & {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
};

/** A patient with its insurance company, as embedded in order/suborder queries. */
type PatientWithInsurance = PatientRow & {
  insurance_companies: InsuranceCompanyRow | null;
};

/**
 * A suborder as embedded inside an order: the suborder plus its patient. The
 * parent order is not repeated here — it's the row this suborder hangs off of.
 * Matches the embed `suborders(*, patient:patients(*, insurance_companies(*)))`.
 */
export type OrderSubOrder = SuborderRow & {
  patient: PatientWithInsurance;
};

/**
 * A standalone suborder with the relations the suborder table columns read: its
 * patient (+ insurance company) and its parent order (+ that order's medicine).
 * Matches the embed `patient:patients(...)` + `order:orders(*, medicine(*))`.
 * Extends {@link OrderSubOrder} with the back-reference to the parent order.
 */
export type SubOrder = OrderSubOrder & {
  // `created_by` is omitted so this accepts both the standalone suborder query
  // (scalar created_by) and a parent order injected in OrdersTable (where
  // created_by is the embedded user row). The columns only read medicine + dates.
  order: Omit<OrderRow, "created_by"> & { medicine: MedicineRow | null };
};

/**
 * An order together with its suborders — the shape the list/detail views need,
 * since the bare `orders` Row has no suborders. Mirrors the embed in
 * `ORDER_SELECT` (api/browser/orders.ts): the order, its medicine, and each
 * suborder with its patient (+ that patient's insurance company).
 */
export type OrderWithSubOrders = Omit<OrderRow, "created_by"> & {
  medicine: MedicineRow | null;
  // The `created_by` scalar (a user id) is replaced by the embedded creator's
  // user_data row via `created_by:user_data(*)` in ORDER_SELECT.
  created_by: CreatedByUser | null;
  suborders: OrderSubOrder[];
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
