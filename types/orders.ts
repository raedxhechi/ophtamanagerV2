import type { Database, TablesInsert } from "./supabase";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type SuborderRow = Database["public"]["Tables"]["suborders"]["Row"];
type PatientRow = Database["public"]["Tables"]["patients"]["Row"];
type MedicineRow = Database["public"]["Tables"]["medicine"]["Row"];
type InsuranceCompanyRow =
  Database["public"]["Tables"]["insurance_companies"]["Row"];

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
 * An order with the relations the create/draft form reads: its medicine and
 * each suborder's patient (+ that patient's insurance company). Matches the
 * embedded shape returned by the order queries in api/browser.
 */
export type DraftOrder = OrderRow & {
  medicine: MedicineRow;
  subOrders: OrderSubOrder[];
};

/**
 * A standalone suborder with the relations the suborder table columns read: its
 * patient (+ insurance company) and its parent order (+ that order's medicine).
 * Matches the embed `patient:patients(...)` + `order:orders(*, medicine(*))`.
 * Extends {@link OrderSubOrder} with the back-reference to the parent order.
 */
export type SubOrder = OrderSubOrder & {
  order: OrderRow & { medicine: MedicineRow | null };
};

/**
 * An order together with its suborders — the shape the list/detail views need,
 * since the bare `orders` Row has no suborders. Mirrors the embed in
 * `ORDER_SELECT` (api/browser/orders.ts): the order, its medicine, and each
 * suborder with its patient (+ that patient's insurance company).
 */
export type OrderWithSubOrders = OrderRow & {
  medicine: MedicineRow | null;
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
