import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PolicyForm } from "../_components/PolicyForm";
import { listPolicySummaries, loadPolicyFormOptions } from "../_data";

/**
 * A new insurance policy.
 *
 * `?office=` carries the list's filter through, so "New policy" while looking
 * at one office starts on that office. `?duplicate=` is the Duplicate action on
 * a card — the same thing the "copy from" picker does, reached from the policy
 * being copied rather than from the form.
 */
export default async function NewPolicyPage({
  searchParams,
}: {
  searchParams: Promise<{ office?: string; duplicate?: string }>;
}) {
  const { office, duplicate } = await searchParams;

  const [{ offices, medicines, companies }, sources] = await Promise.all([
    loadPolicyFormOptions(),
    listPolicySummaries(),
  ]);

  const backHref = office
    ? `/admin/policies?office=${office}`
    : "/admin/policies";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to policies
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          New insurance policy
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick the doctor office, then the insurance companies and the medicines
          they cover. Copy an existing policy to start from what another office
          already has.
        </p>
      </div>

      <PolicyForm
        policy={null}
        offices={offices}
        medicines={medicines}
        companies={companies}
        sources={sources}
        initialOfficeId={office ?? null}
        initialSourceId={duplicate ?? null}
      />
    </div>
  );
}
