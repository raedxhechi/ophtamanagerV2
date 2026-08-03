import { createClient } from "@/supabase/server";

import { OrdersTable, type OrderRow } from "./_components/OrdersTable";

export default async function OrdersPage() {
  const supabase = await createClient();

  // RLS scopes this to the current user's office automatically.
  const { data, error } = await supabase
    .from("orders")
    .select("*, medicine:medicine_id(name)")
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as OrderRow[];

  return (
    <div className="mx-auto w-full max-w-[96rem] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Failed to load orders: {error.message}
        </p>
      ) : (
        <OrdersTable data={orders} />
      )}
    </div>
  );
}
