import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { createClient } from "@/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { dashboardRanges, type Range } from "./ranges";

type Client = Awaited<ReturnType<typeof createClient>>;

/** The counted tables. All three stamp `created_at` with now() on insert. */
const METRICS = [
  { table: "orders", label: "Orders" },
  { table: "suborders", label: "Suborders" },
  { table: "patients", label: "Patients" },
] as const;

type MetricTable = (typeof METRICS)[number]["table"];

/** How many rows a table gained in a window. `head` fetches the count only. */
async function countCreated(
  supabase: Client,
  table: MetricTable,
  range: Range
): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .gte("created_at", range.from)
    .lt("created_at", range.to);
  return count ?? 0;
}

/**
 * The change from the comparable window, as a signed percentage. With nothing
 * to compare against, the raw gain is shown instead of a division by zero.
 */
function trend(current: number, previous: number): { label: string; up: boolean } {
  if (previous === 0) {
    return { label: current === 0 ? "0%" : `+${current}`, up: current > 0 };
  }
  const change = Math.round(((current - previous) / previous) * 100);
  return { label: `${change > 0 ? "+" : ""}${change}%`, up: change >= 0 };
}

const number = new Intl.NumberFormat("de-DE");

/** Wide screens get one column per metric; there are three. */
const GRID =
  "*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-3";

/**
 * How many orders, suborders and patients were created this week and this
 * month, each against the same elapsed span of the week and month before.
 */
export async function SectionCards() {
  const supabase = await createClient();

  // RLS scopes these counts to the caller's own office, which would quietly
  // look like a very small database rather than an error. Checking outright
  // turns that into a clear answer, as on the other admin pages.
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return (
      <p className="text-muted-foreground text-sm">
        You need an admin account to view these totals.
      </p>
    );
  }

  const ranges = dashboardRanges();

  const cards = await Promise.all(
    METRICS.map(async ({ table, label }) => {
      const [week, previousWeek, month, previousMonth] = await Promise.all([
        countCreated(supabase, table, ranges.week),
        countCreated(supabase, table, ranges.previousWeek),
        countCreated(supabase, table, ranges.month),
        countCreated(supabase, table, ranges.previousMonth),
      ]);
      return { table, label, week, previousWeek, month, previousMonth };
    })
  );

  return (
    <div className={GRID}>
      {cards.map((card) => {
        const weekTrend = trend(card.week, card.previousWeek);
        const monthTrend = trend(card.month, card.previousMonth);
        const WeekIcon = weekTrend.up ? IconTrendingUp : IconTrendingDown;
        const MonthIcon = monthTrend.up ? IconTrendingUp : IconTrendingDown;

        return (
          <Card key={card.table} className="@container/card">
            <CardHeader>
              <CardDescription>{card.label} this week</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {number.format(card.week)}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <WeekIcon />
                  {weekTrend.label}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex items-center gap-2 font-medium">
                {number.format(card.month)} this month
                <MonthIcon className="size-4" />
                <span className="text-muted-foreground font-normal">
                  {monthTrend.label}
                </span>
              </div>
              <div className="text-muted-foreground">
                Same point last week {number.format(card.previousWeek)} · last
                month {number.format(card.previousMonth)}
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

/** Stand-in while the counts are being fetched, in the same three-card frame. */
export function SectionCardsFallback() {
  return (
    <div className={GRID} aria-busy="true">
      {METRICS.map(({ table }) => (
        <Card key={table} className="@container/card">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-8 w-20" />
            <CardAction>
              <Skeleton className="h-6 w-14 rounded-md" />
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-52" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
