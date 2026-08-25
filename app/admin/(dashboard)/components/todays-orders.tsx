import Link from "next/link";

import { formatDate } from "@/lib/date";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { createClient } from "@/supabase/server";
import { dashboardRanges, localTime, localToday } from "./ranges";

/** Only what the seven columns below read — this list is not editable here. */
const TODAYS_ORDERS_SELECT = `
  id,
  created_at,
  quantity,
  application_date,
  medicine:medicine_id(name),
  doctor_office:doctor_office_id(name),
  created_by_user:created_by(email, first_name, last_name),
  suborders (id)
`;

type TodaysOrder = {
  id: string;
  created_at: string | null;
  quantity: number;
  application_date: string | null;
  medicine: { name: string | null } | null;
  doctor_office: { name: string | null } | null;
  created_by_user: {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  suborders: { id: string }[];
};

function orDash(value: string | null | undefined): React.ReactNode {
  return value ? value : <span className="text-muted-foreground">—</span>;
}

/** The creator's name, falling back to their email. */
function creatorLabel(order: TodaysOrder): string {
  const user = order.created_by_user;
  if (!user) return "";
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return name || user.email || "";
}

function Frame({
  children,
  count,
}: {
  children: React.ReactNode;
  /** Row count for the subheading; omitted while the query is still running. */
  count?: number;
}) {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Orders created today
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {localToday()}
            {count === undefined
              ? ""
              : ` · ${count} order${count === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="text-sm font-medium underline-offset-4 hover:underline"
        >
          All orders
        </Link>
      </div>
      {children}
    </div>
  );
}

/**
 * Every order created since local midnight, newest first. A single day's worth
 * of rows, so it is neither paged nor filtered — /admin/orders is where the
 * whole history is searched and edited.
 */
export async function TodaysOrders() {
  const supabase = await createClient();

  // Same reasoning as the cards: RLS would narrow this to the caller's own
  // office instead of failing, so the check is explicit.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return (
      <p className="text-muted-foreground text-sm">
        You need an admin account to view today&apos;s orders.
      </p>
    );
  }

  const { todayStart } = dashboardRanges();
  const { data, error } = await supabase
    .from("orders")
    .select(TODAYS_ORDERS_SELECT)
    .gte("created_at", todayStart)
    .order("created_at", { ascending: false })
    // Stable tiebreaker for orders sharing a created_at, as in the admin list.
    .order("id", { ascending: false });

  if (error) {
    return (
      <Frame>
        <p className="text-destructive text-sm">
          Failed to load today&apos;s orders: {error.message}
        </p>
      </Frame>
    );
  }

  const orders = (data ?? []) as unknown as TodaysOrder[];

  return (
    <Frame count={orders.length}>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Medicine</TableHead>
              <TableHead>Doctor office</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Suborders</TableHead>
              <TableHead>Application date</TableHead>
              <TableHead>Created by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length ? (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="tabular-nums">
                    {orDash(localTime(order.created_at))}
                  </TableCell>
                  <TableCell className="font-medium">
                    {orDash(order.medicine?.name)}
                  </TableCell>
                  <TableCell>{orDash(order.doctor_office?.name)}</TableCell>
                  <TableCell className="tabular-nums">
                    {order.quantity}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {order.suborders.length}
                  </TableCell>
                  <TableCell>
                    {orDash(formatDate(order.application_date))}
                  </TableCell>
                  <TableCell>{orDash(creatorLabel(order))}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground h-24 text-center"
                >
                  No orders have been created today yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Frame>
  );
}

/** Stand-in while the day's orders are being fetched. */
export function TodaysOrdersFallback() {
  return (
    <Frame>
      <div className="overflow-hidden rounded-lg border" aria-busy="true">
        <div className="bg-muted/50 flex items-center gap-4 px-4 py-3">
          {Array.from({ length: 7 }, (_, column) => (
            <Skeleton key={column} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: 6 }, (_, row) => (
          <div key={row} className="flex items-center gap-4 border-t px-4 py-3.5">
            {Array.from({ length: 7 }, (_, column) => (
              <Skeleton key={column} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </Frame>
  );
}
