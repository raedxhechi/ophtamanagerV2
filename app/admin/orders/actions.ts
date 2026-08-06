"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/supabase/server";
import type { Database } from "@/types/supabase";

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

  const { error } = await supabase
    .from("orders")
    .update({
      medicine_id,
      quantity,
      application_date: applicationDate.value,
      delivery_date: deliveryDate.value,
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
