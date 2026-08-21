import Link from "next/link";
import { Building2, Pill } from "lucide-react";

import { createClient } from "@/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { OfficeSelect } from "./_components/OfficeSelect";
import { PolicyImageDrawer } from "./_components/PolicyImageDrawer";

type RawCard = {
  id: string;
  medicines: { count: number }[];
  companies: { count: number }[];
};

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ office?: string }>;
}) {
  const { office } = await searchParams;
  const supabase = await createClient();

  const { data: officesData } = await supabase
    .from("doctor_office")
    .select("id, name")
    .order("name");
  const offices = officesData ?? [];

  let cards: { id: string; medicineCount: number; companyCount: number }[] = [];
  if (office) {
    const { data } = await supabase
      .from("insurance_policy")
      .select(
        "id, medicines:insurance_policy_medicines(count), companies:insurance_policy_insurance_companies(count)"
      )
      .eq("doctor_office_id", office)
      .order("created_at", { ascending: false });

    cards = ((data ?? []) as unknown as RawCard[]).map((c) => ({
      id: c.id,
      medicineCount: c.medicines[0]?.count ?? 0,
      companyCount: c.companies[0]?.count ?? 0,
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Insurance policies
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a doctor office, then open a policy to see its medicines and
            insurance companies.
          </p>
        </div>

        {/* Not scoped to the office picked below — one image serves them all. */}
        <PolicyImageDrawer />
      </div>

      <OfficeSelect offices={offices} selectedOfficeId={office ?? null} />

      {!office ? (
        <p className="text-sm text-muted-foreground">
          Select a doctor office to view its insurance policies.
        </p>
      ) : cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No insurance policies for this office.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => (
            <Link
              key={card.id}
              href={`/admin/policies/${card.id}`}
              className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors hover:border-primary hover:bg-accent/40">
                <CardHeader>
                  <CardTitle className="text-base">
                    Policy {index + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="flex items-center gap-2">
                      <Building2 className="size-4 text-muted-foreground" />
                      <span className="font-medium tabular-nums">
                        {card.companyCount}
                      </span>
                      <span className="text-muted-foreground">companies</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Pill className="size-4 text-muted-foreground" />
                      <span className="font-medium tabular-nums">
                        {card.medicineCount}
                      </span>
                      <span className="text-muted-foreground">medicines</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
