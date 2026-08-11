"use server";

import { aggregate } from "@directus/sdk";

import { createDirectusServerClient } from "@/directus/server";
import { createClient } from "@/supabase/server";

import { failResult, type ImportResult, type SyncCounts } from "../types";
import { describeError, importOrdersEvents } from "./import-core";

export type ClearResult = { ok: boolean; message: string };

/** Count of orders (and suborders) in Directus and Supabase, for the pre-import view. */
export async function getOrderCounts(): Promise<SyncCounts> {
  const directus = createDirectusServerClient();
  const supabase = await createClient();

  const [ordersAgg, subAgg, ordersRes, subRes] = await Promise.all([
    directus.request(
      aggregate("orders", { aggregate: { count: "*" } })
    ) as Promise<Array<{ count: string | number | null }>>,
    directus.request(
      aggregate("subOrders", { aggregate: { count: "*" } })
    ) as Promise<Array<{ count: string | number | null }>>,
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("suborders").select("id", { count: "exact", head: true }),
  ]);

  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (subRes.error) throw new Error(subRes.error.message);

  return {
    directus: Number(ordersAgg?.[0]?.count ?? 0),
    supabase: ordersRes.count ?? 0,
    secondary: {
      label: "suborders",
      directus: Number(subAgg?.[0]?.count ?? 0),
      supabase: subRes.count ?? 0,
    },
  };
}

/**
 * Non-streaming import: drains the streaming generator and returns only its
 * final result. The Orders sync page uses the streamed route (for the live log +
 * running count); this stays as a plain server-action entry point.
 */
export async function importOrders(): Promise<ImportResult> {
  let result: ImportResult = failResult("Import produced no result.");
  for await (const event of importOrdersEvents()) {
    if (event.type === "result") result = event.result;
  }
  return result;
}

/**
 * Delete every suborder and then every order in Supabase (admins only). Suborders
 * go first: they reference orders with ON DELETE RESTRICT, so orders can't be
 * removed while suborders still point at them.
 */
export async function clearAllOrders(): Promise<ClearResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated." };
  const { data: profile } = await supabase
    .from("user_data")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { ok: false, message: "Only admins can clear orders." };
  }

  try {
    // `.not("id", "is", null)` matches every row (id is never null).
    const { count: subCount, error: subError } = await supabase
      .from("suborders")
      .delete({ count: "exact" })
      .not("id", "is", null);
    if (subError) throw subError;

    const { count: orderCount, error: orderError } = await supabase
      .from("orders")
      .delete({ count: "exact" })
      .not("id", "is", null);
    if (orderError) throw orderError;

    return {
      ok: true,
      message: `Deleted ${orderCount ?? 0} orders and ${subCount ?? 0} suborders.`,
    };
  } catch (e) {
    console.log("[orders-sync] clear all failed:", e);
    return { ok: false, message: describeError(e) };
  }
}
