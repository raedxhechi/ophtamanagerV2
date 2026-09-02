import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Copy, Pencil } from "lucide-react";

import { createClient } from "@/supabase/server";
import { Button } from "@/components/ui/button";

import { PolicyDetail } from "../_components/PolicyDetail";
import type { CompanyItem, MedicineItem } from "../_components/types";

type RawPolicy = {
  id: string;
  doctor_office_id: string | null;
  insurance_policy_medicines: { medicine: MedicineItem | null }[] | null;
  insurance_policy_insurance_companies:
    | { insurance_company: CompanyItem | null }[]
    | null;
};

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("insurance_policy")
    .select(
      `id, doctor_office_id,
       insurance_policy_medicines (
         medicine:medicine_id ( id, name, medicine_type, background_color, text_color )
       ),
       insurance_policy_insurance_companies (
         insurance_company:insurance_company_id ( id, name, insurance_type, iknumber )
       )`
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const policy = data as unknown as RawPolicy;
  const medicines = (policy.insurance_policy_medicines ?? [])
    .map((link) => link.medicine)
    .filter((m): m is MedicineItem => m !== null);
  const companies = (policy.insurance_policy_insurance_companies ?? [])
    .map((link) => link.insurance_company)
    .filter((c): c is CompanyItem => c !== null);

  const backHref = policy.doctor_office_id
    ? `/admin/policies?office=${policy.doctor_office_id}`
    : "/admin/policies";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to policies
        </Link>
        <span aria-hidden className="h-4 w-px bg-border" />
        <h1 className="text-xl font-semibold tracking-tight">Policy details</h1>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/policies/new?duplicate=${policy.id}`}>
              <Copy />
              Duplicate
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/admin/policies/${policy.id}/edit`}>
              <Pencil />
              Edit policy
            </Link>
          </Button>
        </div>
      </div>

      <PolicyDetail medicines={medicines} companies={companies} />
    </div>
  );
}
