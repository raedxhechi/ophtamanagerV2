import { ArrowRight } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getSyncOverview, type SyncOverview } from "./actions";
import type { SyncCounts } from "./types";

function OverviewCard({
  title,
  counts,
}: {
  title: string;
  counts: SyncCounts;
}) {
  const remaining = Math.max(counts.directus - counts.supabase, 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Directus</span>
            <span className="text-3xl font-semibold tabular-nums">
              {counts.directus}
            </span>
          </div>
          <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Supabase</span>
            <span className="text-3xl font-semibold tabular-nums">
              {counts.supabase}
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {remaining > 0
            ? `${remaining} not yet in Supabase`
            : "Supabase is up to date"}
        </p>
      </CardContent>
    </Card>
  );
}

export default async function SyncOverviewPage() {
  let overview: SyncOverview | null = null;
  let error: string | null = null;

  try {
    overview = await getSyncOverview();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load counts.";
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">Failed to load counts: {error}</p>
    );
  }

  if (!overview) return null;

  return (
  

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <OverviewCard title="Patients" counts={overview.patients} />
      <OverviewCard title="Doctor offices" counts={overview.doctorOffices} />
      <OverviewCard title="Medicines" counts={overview.medicines} />
      <OverviewCard
        title="Insurance companies"
        counts={overview.insuranceCompanies}
      />
      <OverviewCard
        title="Insurance policies"
        counts={overview.insurancePolicies}
      />
      <OverviewCard title="Orders" counts={overview.orders} />
    </div>
 
  );
}
