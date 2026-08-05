import type { OrderWithSubOrders } from "@/types";
import { createClient } from "@/supabase/server";

import { OrdersTable } from "./_components/OrdersTable";

const PAGE_SIZE = 100;

// Orders and their suborders are fetched together, one page at a time. Each
// suborder embeds its patient (+ insurance); the parent order's medicine is
// embedded once at the top level and injected into each suborder in OrdersTable.
const ORDERS_SELECT =
  "*, medicine:medicine_id(*), suborders(*, patient:patients(*, insurance_companies(*)))";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const supabase = await createClient();

  const { page: pageParam, q: qParam } = await searchParams;
  const requestedPage = Math.max(1, Number(pageParam) || 1);
  const search = (qParam ?? "").trim();
  const from = (requestedPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // RLS scopes this to the current user's office automatically. `count: exact`
  // returns the office's (filtered) order count so the page count can be
  // derived. Search is server-side: each whitespace-separated token must appear
  // in the order's `search_text` (ANDed), so results span all pages, not just
  // the loaded one. The order's search_text bundles its medicine, dates, and
  // every suborder's patient details, so a patient name matches its orders too.
  let query = supabase
    .from("orders")
    .select(ORDERS_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    // Stable tiebreaker so orders with an identical created_at keep a fixed
    // order and never shuffle between pages.
    .order("id", { ascending: false })
    .range(from, to);

  for (const token of search.split(/\s+/).filter(Boolean)) {
    query = query.ilike("search_text", `%${token}%`);
  }

  const { data, error, count } = await query;

  const totalCount = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const orders = (data ?? []) as unknown as OrderWithSubOrders[];

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
        <OrdersTable
          data={orders}
          page={requestedPage}
          pageCount={pageCount}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          search={search}
        />
      )}
    </div>
  );
}
