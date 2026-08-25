"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/supabase/server";

import { parseOrderStatus, type OrderStatus } from "./status";

export type UpdateOrderStatusState = { error: string } | null;

/**
 * Move one order to a different status.
 *
 * Shared by the private orders list, the admin orders list and anything else
 * that wants to change only the status: it is one column, so it does not need
 * the whole order form the admin drawer submits.
 *
 * Authorisation is RLS, asked by reading the row back. Only admins and managers
 * hold an UPDATE policy on orders, so for anyone else the statement matches
 * nothing and PostgREST returns success with no row — which is why the absence
 * of a row is treated as the refusal rather than as "nothing to do". A manager
 * reaching outside their offices lands in the same branch.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<UpdateOrderStatusState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Checked here rather than left to the enum's own type error, so a bad value
  // comes back as a sentence instead of a Postgres cast failure.
  const parsed = parseOrderStatus(status);
  if (!parsed) {
    return { error: `"${status}" is not an order status.` };
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ status: parsed })
    .eq("id", orderId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: "You don't have permission to change this order's status." };
  }

  // Both lists show the column, and an admin or a manager may have either open
  // — revalidating only the one they clicked in would leave the other stale.
  revalidatePath("/orders");
  revalidatePath("/admin/orders");
  return null;
}
