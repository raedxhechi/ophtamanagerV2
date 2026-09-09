import Link from "next/link";
import { Building2, Copy, Pencil, Pill, Plus } from "lucide-react";

import { createClient } from "@/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { OfficeSelect } from "./_components/OfficeSelect";
import { PolicyImageDrawer } from "./_components/PolicyImageDrawer";
import type { PolicySummary } from "./_components/types";
import { listPolicySummaries, UNASSIGNED_OFFICE } from "./_data";

/**
 * Every office's policies at once, grouped under the office they belong to.
 * The picker above them narrows the page to one group rather than being the
 * thing that makes the page show anything — an admin reaches every office, and
 * "which offices have policies at all" is a question the page should answer
 * before it is asked.
 */
export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ office?: string }>;
}) {
  const { office } = await searchParams;
  const supabase = await createClient();

  const [{ data: officesData }, policies] = await Promise.all([
    supabase.from("doctor_office").select("id, name").order("name"),
    listPolicySummaries(),
  ]);
  const offices = officesData ?? [];

  // Every office gets a group, including the ones with no policies yet: an
  // empty group is the answer to "does this office have any?", where a missing
  // one leaves the admin guessing whether it exists.
  const groups: { key: string; name: string; policies: PolicySummary[] }[] =
    offices.map((entry) => ({
      key: entry.id,
      name: entry.name ?? "Unnamed office",
      policies: policies.filter((policy) => policy.officeId === entry.id),
    }));

  // The column is nullable, so a policy can belong to no office. Last, and only
  // when there is one.
  const orphans = policies.filter((policy) => policy.officeId === null);
  if (orphans.length) {
    groups.push({ key: "none", name: UNASSIGNED_OFFICE, policies: orphans });
  }

  const shown = office ? groups.filter((group) => group.key === office) : groups;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Insurance policies
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What each doctor office&apos;s insurance companies cover. Open a policy to
            see its medicines and companies, or edit it to change them.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Not scoped to the office picked below — one image serves them all. */}
          <PolicyImageDrawer />
          <Button asChild size="sm">
            <Link
              href={
                office ? `/admin/policies/new?office=${office}` : "/admin/policies/new"
              }
            >
              <Plus />
              New policy
            </Link>
          </Button>
        </div>
      </div>

      <OfficeSelect offices={offices} selectedOfficeId={office ?? null} />

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {office
            ? "That doctor office is no longer here."
            : "There are no doctor offices yet."}
        </p>
      ) : (
        shown.map((group) => (
          <section key={group.key} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-medium tracking-tight">{group.name}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                {group.policies.length}
              </span>
            </div>

            {group.policies.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No insurance policies for this office.{" "}
                <Link
                  href={`/admin/policies/new?office=${group.key}`}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  Add one
                </Link>
                .
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.policies.map((policy) => (
                  <PolicyCard key={policy.id} policy={policy} />
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}

/**
 * The card is one link with two buttons on it, so the title carries the link
 * over the whole card (`after:absolute after:inset-0`) rather than the card
 * being wrapped in an anchor — the actions could not be nested inside one.
 */
function PolicyCard({ policy }: { policy: PolicySummary }) {
  return (
    <Card className="relative h-full transition-colors hover:border-primary hover:bg-accent/40">
      <CardHeader>
        <CardTitle className="text-base">
          <Link
            href={`/admin/policies/${policy.id}`}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            {policy.label}
          </Link>
        </CardTitle>
        <CardAction className="relative z-10 flex items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-8"
            title="Duplicate this policy"
          >
            <Link href={`/admin/policies/new?duplicate=${policy.id}`}>
              <Copy className="size-4" />
              <span className="sr-only">Duplicate {policy.label}</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-8"
            title="Edit this policy"
          >
            <Link href={`/admin/policies/${policy.id}/edit`}>
              <Pencil className="size-4" />
              <span className="sr-only">Edit {policy.label}</span>
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6 text-sm">
          <span className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            <span className="font-medium tabular-nums">
              {policy.companyIds.length}
            </span>
            <span className="text-muted-foreground">companies</span>
          </span>
          <span className="flex items-center gap-2">
            <Pill className="size-4 text-muted-foreground" />
            <span className="font-medium tabular-nums">
              {policy.medicineIds.length}
            </span>
            <span className="text-muted-foreground">medicines</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
