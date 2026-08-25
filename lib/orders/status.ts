import { Constants } from "@/types/supabase";
import type { Database } from "@/types/supabase";
import type { UserRole } from "@/types/user";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

/**
 * The statuses, in the order an order moves through them — which is the order
 * the dropdown lists them in, so picking the next step is picking the next row.
 *
 * Read from the generated constants rather than written out again, so a status
 * added by a migration reaches the UI as soon as the types are regenerated.
 * `ORDER_STATUS_LABELS` is a total Record, so that new value is a type error
 * here until it is given a label — which is the reminder we want.
 */
export const ORDER_STATUSES = Constants.public.Enums.order_status;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  ready: "Ready",
  delivered: "Delivered",
};

/**
 * Badge colours, as a progression rather than a set of unrelated hues: grey
 * while nothing has happened, blue once it is being worked on, amber while it
 * waits for someone to come and get it, green when it is gone. Each carries its
 * own dark-mode pair, since the tables are read in both.
 */
export const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  pending: "border-transparent bg-muted text-muted-foreground",
  processing:
    "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  ready:
    "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  delivered:
    "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

/**
 * The sentinel a form select uses for "no status" — Radix rejects an empty item
 * value, and an unset select would otherwise be indistinguishable from a
 * cleared one. Only reachable for an order that predates the column.
 */
export const NO_ORDER_STATUS = "__none__";

/**
 * Who may move an order along.
 *
 * The same answer RLS gives: "Admins have full access to orders" and "Managers
 * can update orders in their offices" are the only UPDATE policies on the
 * table, so a doctor or assistant can read a status and never write one. This
 * is the UI half of that — it decides whether the cell is a badge or a
 * dropdown, so nobody is offered a menu whose every option would be refused.
 * The database is still the one enforcing it.
 */
export function canEditOrderStatus(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "manager";
}

/** Narrow an untrusted string to a real status. */
export function parseOrderStatus(value: string | null): OrderStatus | null {
  const statuses = ORDER_STATUSES as readonly string[];
  return value && statuses.includes(value) ? (value as OrderStatus) : null;
}
