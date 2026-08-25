import type { DraftOrder } from "@/types";
import { getOfficeContext } from "@/lib/office/context";
import { createClient } from "@/supabase/server";

import { DraftOrdersTable } from "./_components/DraftOrdersTable";

export default async function DraftOrdersPage() {
  const supabase = await createClient();
  const { officeId } = await getOfficeContext();

  // Mirrors the orders page: scoped to the office being worked in, which for an
  // admin or a manager is the one picked in the header. The suborder relation
  // is aliased to `subOrders` so the rows match the DraftOrder type the
  // create-order form also reads. `medicine` may be null — a draft can be
  // parked before one is picked.
  const { data, error } = officeId
    ? await supabase
        .from("draft_orders")
        .select(
          "*, medicine:medicine_id(*), subOrders:draft_suborders(*, patient:patients(*, insurance_companies(*)))"
        )
        .eq("doctor_office_id", officeId)
        .order("created_at", { ascending: false })
    : { data: null, error: null };

  const draftOrders = (data ?? []) as unknown as DraftOrder[];

  return (
    <div className="mx-auto w-full max-w-[96rem] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Draft orders</h1>
      </div>

      {!officeId ? (
        <p className="text-sm text-muted-foreground">
          No doctor office selected.
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">
          Failed to load draft orders: {error.message}
        </p>
      ) : (
        <DraftOrdersTable data={draftOrders} />
      )}
    </div>
  );
}
