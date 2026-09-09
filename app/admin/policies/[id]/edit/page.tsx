import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/supabase/server";

import { PolicyForm } from "../../_components/PolicyForm";
import { loadPolicyFormOptions } from "../../_data";

type RawPolicy = {
  id: string;
  doctor_office_id: string | null;
  insurance_policy_medicines: { medicine_id: string }[] | null;
  insurance_policy_insurance_companies: { insurance_company_id: string }[] | null;
};

export default async function EditPolicyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data }, { offices, medicines, companies }] = await Promise.all([
    supabase
      .from("insurance_policy")
      .select(
        `id, doctor_office_id,
         insurance_policy_medicines ( medicine_id ),
         insurance_policy_insurance_companies ( insurance_company_id )`
      )
      .eq("id", id)
      .maybeSingle(),
    loadPolicyFormOptions(),
  ]);

  if (!data) {
    notFound();
  }

  const policy = data as unknown as RawPolicy;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/admin/policies/${policy.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to the policy
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Edit insurance policy
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ticking and unticking here is what the office&apos;s order forms enforce —
          which medicines its insurance companies cover.
        </p>
      </div>

      <PolicyForm
        policy={{
          id: policy.id,
          doctorOfficeId: policy.doctor_office_id,
          medicineIds: (policy.insurance_policy_medicines ?? []).map(
            (link) => link.medicine_id
          ),
          companyIds: (policy.insurance_policy_insurance_companies ?? []).map(
            (link) => link.insurance_company_id
          ),
        }}
        offices={offices}
        medicines={medicines}
        companies={companies}
        /* Editing has no "copy from": replacing a live policy's contents from
           another one is a different act than composing a new one, and it is
           done by creating the copy and moving the office over. */
        sources={[]}
      />
    </div>
  );
}
