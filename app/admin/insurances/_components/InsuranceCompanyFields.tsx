"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Constants } from "@/types/supabase";

import { insuranceTypeLabel, type AdminInsuranceCompanyRow } from "./types";

/**
 * Everything an admin can set on an insurance company — which is three fields —
 * followed, when there is one to show, by the policies it is named in.
 *
 * Shared by both drawers: the create form asks for exactly what the edit form
 * does, so it is the same component with nothing filled in. `company` is what
 * tells them apart — absent means a blank form and no policy list, since a
 * company that does not exist yet is named in nothing.
 *
 * Uncontrolled inputs, except the type: Radix's Select renders a hidden native
 * select for `name`, so the drawer's plain <form> carries it either way.
 */
export function InsuranceCompanyFields({
  company,
}: {
  company?: AdminInsuranceCompanyRow;
}) {
  return (
    <>
      <section className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={company?.name}
            autoComplete="off"
          />
          <p className="text-muted-foreground text-xs">
            As it should read on a prescription — this is the name every patient
            and order shows.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="insurance_type">
            Insurance type <span className="text-destructive">*</span>
          </Label>
          <Select
            name="insurance_type"
            required
            defaultValue={company?.insurance_type}
          >
            <SelectTrigger id="insurance_type" className="w-full">
              <SelectValue placeholder="Pick an insurance type" />
            </SelectTrigger>
            <SelectContent>
              {Constants.public.Enums.insurance_type.map((value) => (
                <SelectItem key={value} value={value}>
                  {insuranceTypeLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Private insurers are billed to the patient, public ones to the fund.
            Changing it changes how every order for this insurer is invoiced.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="iknumber">IK number</Label>
          <Input
            id="iknumber"
            name="iknumber"
            defaultValue={company?.iknumber ?? ""}
            autoComplete="off"
            inputMode="numeric"
            placeholder="e.g. 101575519"
          />
          <p className="text-muted-foreground text-xs">
            The Institutionskennzeichen. Optional — private insurers often have
            none.
          </p>
        </div>
      </section>

      {company ? <CompanyPoliciesField company={company} /> : null}
    </>
  );
}

/**
 * The policies that name this company — shown, not edited.
 *
 * The link lives in `insurance_policy_insurance_companies`, and a policy is
 * about far more than one company: it also carries the medicines it covers and
 * the office it belongs to. Editing that from here would mean editing a policy
 * through a window that shows one of its three sides, so the drawer links out
 * to the policy instead of pretending to own it.
 */
function CompanyPoliciesField({
  company,
}: {
  company: AdminInsuranceCompanyRow;
}) {
  return (
    <section className="grid gap-2">
      <Label>Named in policies</Label>

      <div className="max-h-64 overflow-y-auto rounded-md border py-1">
        {company.offices.length ? (
          company.offices.map((office) => (
            <div key={office.key} className="px-3 py-2">
              <p className="text-sm font-medium">{office.name}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {office.policies.map((policy) => (
                  <Badge key={policy.id} variant="outline" asChild>
                    <Link href={`/admin/policies/${policy.id}`}>
                      {policy.label}
                    </Link>
                  </Badge>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm">
            No policy names this insurance company yet.
          </p>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        {company.policyCount
          ? `${company.policyCount} polic${company.policyCount === 1 ? "y" : "ies"} across ${company.offices.length} doctor office${company.offices.length === 1 ? "" : "s"}.`
          : "Nothing points at this insurance company."}{" "}
        Which medicines each policy covers is edited on the policy itself.
      </p>
    </section>
  );
}
