"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/supabase/server";
import type { Database } from "@/types/supabase";

import { NO_ORDER_STATUS, parseOrderStatus } from "@/lib/orders/status";

import { NO_INVOICE_TYPE } from "./_components/invoiceType";

type InvoiceType = Database["public"]["Enums"]["invoice_types"];

export type UpdateOrderState = { error: string } | { success: true } | null;

/** Trim a FormData string field, returning null when empty. */
function field(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? null : trimmed;
}

/** A date input submits yyyy-mm-dd or nothing; anything else is a bad request. */
function dateField(
  formData: FormData,
  key: string
): { value: string | null } | { error: string } {
  const value = field(formData, key);
  if (value === null) return { value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: `Invalid ${key}.` };
  return { value };
}

/**
 * Update an order and its suborders from the admin drawer.
 *
 * Office users can create orders but not edit them (see the orders RLS in the
 * create_orders migration), so this has no office-scoped counterpart — editing
 * an existing order is an admin action by design, and the explicit is_admin
 * check is what turns "no rows matched" into a message.
 *
 * The order and each suborder are separate statements: PostgREST has no
 * multi-table transaction, so a failure partway through leaves the earlier
 * writes in place. The first error is reported and the rest are abandoned
 * rather than silently swallowed.
 */
export async function updateOrderAsAdmin(
  _prev: UpdateOrderState,
  formData: FormData
): Promise<UpdateOrderState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { error: "You need an admin account to edit orders." };
  }

  const id = field(formData, "id");
  if (!id) {
    return { error: "Missing order id." };
  }

  const medicine_id = field(formData, "medicine_id");
  if (!medicine_id) {
    return { error: "A medicine is required." };
  }

  const quantity = Number(field(formData, "quantity"));
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { error: "Quantity must be a whole number of at least 1." };
  }

  const applicationDate = dateField(formData, "application_date");
  if ("error" in applicationDate) return applicationDate;
  const deliveryDate = dateField(formData, "delivery_date");
  if ("error" in deliveryDate) return deliveryDate;

  // The column is nullable for orders that predate it, so the select carries a
  // sentinel for "none" — an unrecognised value is a bad request rather than a
  // silent fallback to null, which would quietly clear a status.
  const rawStatus = field(formData, "status");
  const status =
    rawStatus === NO_ORDER_STATUS ? null : parseOrderStatus(rawStatus);
  if (rawStatus !== NO_ORDER_STATUS && rawStatus !== null && !status) {
    return { error: `"${rawStatus}" is not an order status.` };
  }

  const { error } = await supabase
    .from("orders")
    .update({
      medicine_id,
      quantity,
      application_date: applicationDate.value,
      delivery_date: deliveryDate.value,
      status,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  // Each suborder row in the drawer submits its id, so only the suborders that
  // were actually on screen are touched.
  const subOrderIds = formData
    .getAll("suborder_ids")
    .filter((value): value is string => typeof value === "string");

  for (const subOrderId of subOrderIds) {
    const invoiceType = field(formData, `invoice_type__${subOrderId}`);

    const { error: subOrderError } = await supabase
      .from("suborders")
      .update({
        // An unchecked checkbox submits nothing at all, which is what makes
        // the presence of the field mean "checked".
        left_eye: formData.get(`left_eye__${subOrderId}`) !== null,
        right_eye: formData.get(`right_eye__${subOrderId}`) !== null,
        invoice_type:
          invoiceType && invoiceType !== NO_INVOICE_TYPE
            ? (invoiceType as InvoiceType)
            : null,
      })
      .eq("id", subOrderId)
      // Belt and braces: a suborder id smuggled into the form can only be
      // updated if it really does belong to the order being edited.
      .eq("order_id", id);

    if (subOrderError) {
      return { error: subOrderError.message };
    }
  }

  revalidatePath("/admin/orders");
  return { success: true };
}

export type DeleteOrderState =
  | { error: string }
  | { success: true; subOrders: number }
  | null;

/**
 * Delete an order and every suborder hanging off it.
 *
 * The FK is `on delete restrict` like every other one here, so the cascade is
 * done in this action rather than by the database: the suborders go first, and
 * only then the order. That keeps an accidental delete from anywhere else
 * still blocked by the constraint, and it means the order survives if the
 * suborders can't be removed — the restrict refuses the second statement,
 * which is the safe way round. There is no transaction (PostgREST has none),
 * so the reverse order would be the one that could orphan rows.
 */
export async function deleteOrderAsAdmin(
  _prev: DeleteOrderState,
  formData: FormData
): Promise<DeleteOrderState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { error: "You need an admin account to delete orders." };
  }

  const id = field(formData, "id");
  if (!id) {
    return { error: "Missing order id." };
  }

  const { data: deletedSubOrders, error: subOrderError } = await supabase
    .from("suborders")
    .delete()
    .eq("order_id", id)
    .select("id");

  if (subOrderError) {
    return { error: subOrderError.message };
  }

  const { data: deletedOrders, error } = await supabase
    .from("orders")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return { error: error.message };
  }

  // RLS turns "not allowed" into "no rows matched", and the suborder delete
  // above reports nothing in that case either — so an empty result here is
  // the only sign that the order was never deleted.
  if (!deletedOrders || deletedOrders.length === 0) {
    return { error: "That order no longer exists, or you can't delete it." };
  }

  revalidatePath("/admin/orders");
  return { success: true, subOrders: deletedSubOrders?.length ?? 0 };
}

export type DeleteSubOrderResult = { error: string } | { success: true };

/**
 * Delete a single suborder out of an order.
 *
 * Called straight from the drawer rather than through a form: the suborder
 * rows live inside the order's edit form, and a second form nested in that one
 * is invalid HTML. The order id is passed alongside so the delete can be
 * pinned to it — the same belt and braces the suborder update uses, which
 * stops an id smuggled in from elsewhere being deleted through this action.
 */
export async function deleteSubOrderAsAdmin(
  subOrderId: string,
  orderId: string
): Promise<DeleteSubOrderResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return { error: "You need an admin account to delete suborders." };
  }

  if (!subOrderId || !orderId) {
    return { error: "Missing suborder id." };
  }

  const { data: deleted, error } = await supabase
    .from("suborders")
    .delete()
    .eq("id", subOrderId)
    .eq("order_id", orderId)
    .select("id");

  if (error) {
    return { error: error.message };
  }

  // RLS reports a refusal as nothing matched, same as a row that is already
  // gone — either way the caller shouldn't be told it worked.
  if (!deleted || deleted.length === 0) {
    return { error: "That suborder no longer exists, or you can't delete it." };
  }

  revalidatePath("/admin/orders");
  return { success: true };
}
