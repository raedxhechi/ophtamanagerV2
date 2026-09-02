"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Building2, Copy, Loader2, Pill } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import {
  createInsurancePolicy,
  updateInsurancePolicy,
  type SavePolicyState,
} from "../actions";
import { PickerList } from "./PickerList";
import type {
  CompanyItem,
  MedicineItem,
  OfficeOption,
  PolicySummary,
} from "./types";

/** Radix rejects an empty item value, so "no template" needs a sentinel. */
const NO_SOURCE = "__none__";

/** The policy being edited, as the page reads it out of the database. */
export type PolicyFormValues = {
  id: string;
  doctorOfficeId: string | null;
  medicineIds: string[];
  companyIds: string[];
};

/**
 * The whole of an insurance policy: the office it belongs to, the insurance
 * companies it applies to, and the medicines they cover.
 *
 * One form creates and edits, the way the doctor-office drawer does — the
 * fields are identical either way and only the action, the wording and the
 * "copy from" picker differ. It is a page rather than a drawer because picking
 * over two long lists at once needs the width.
 */
export function PolicyForm({
  policy,
  offices,
  medicines,
  companies,
  sources,
  initialOfficeId,
  initialSourceId,
}: {
  /** The policy being edited, or null when a new one is being created. */
  policy: PolicyFormValues | null;
  offices: OfficeOption[];
  medicines: MedicineItem[];
  companies: CompanyItem[];
  /** Existing policies offered as a starting point. Empty when editing. */
  sources: PolicySummary[];
  /** Office to start on — the one the list was filtered by. */
  initialOfficeId?: string | null;
  /** Policy to start from, for the Duplicate action on the list's cards. */
  initialSourceId?: string | null;
}) {
  const router = useRouter();
  const isNew = policy === null;

  const seed = React.useMemo(
    () => sources.find((source) => source.id === initialSourceId) ?? null,
    [sources, initialSourceId]
  );

  const [sourceId, setSourceId] = React.useState(seed?.id ?? NO_SOURCE);
  const [officeId, setOfficeId] = React.useState(
    policy?.doctorOfficeId ?? initialOfficeId ?? seed?.officeId ?? ""
  );
  const [selectedMedicines, setSelectedMedicines] = React.useState(
    () => new Set(seed?.medicineIds ?? policy?.medicineIds ?? [])
  );
  const [selectedCompanies, setSelectedCompanies] = React.useState(
    () => new Set(seed?.companyIds ?? policy?.companyIds ?? [])
  );

  /**
   * Load an existing policy into the form. Both sets are replaced — that is
   * what "copy this policy" means — while the office is only filled in when
   * none has been picked yet: the usual reason to duplicate is to give *another*
   * office the same coverage, and overwriting a chosen office would undo the
   * first thing the admin decided.
   */
  const pickSource = (nextId: string) => {
    setSourceId(nextId);

    if (nextId === NO_SOURCE) {
      setSelectedMedicines(new Set());
      setSelectedCompanies(new Set());
      return;
    }

    const source = sources.find((candidate) => candidate.id === nextId);
    if (!source) return;

    setSelectedMedicines(new Set(source.medicineIds));
    setSelectedCompanies(new Set(source.companyIds));
    if (!officeId && source.officeId) setOfficeId(source.officeId);
  };

  const [state, formAction, isPending] = useActionState(
    async (previous: SavePolicyState, formData: FormData) => {
      const result = await (isNew
        ? createInsurancePolicy(previous, formData)
        : updateInsurancePolicy(previous, formData));

      if (result && "success" in result) {
        toast.success(
          result.created ? "Insurance policy created" : "Insurance policy saved"
        );
        // Straight to the policy that was written, so the save ends on what it
        // produced rather than back on a form the admin is done with.
        router.push(`/admin/policies/${result.id}`);
      }

      return result;
    },
    null
  );

  // Grouped by office, the way the list is, so a policy is picked the same way
  // it is read: under the office it belongs to.
  const sourceGroups = React.useMemo(() => {
    const groups = new Map<string, PolicySummary[]>();
    for (const source of sources) {
      const held = groups.get(source.officeName);
      if (held) held.push(source);
      else groups.set(source.officeName, [source]);
    }
    // By office name, like the list and the office picker — the summaries
    // arrive in creation order, which interleaves the offices.
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [sources]);

  const cancelHref = policy
    ? `/admin/policies/${policy.id}`
    : officeId
      ? `/admin/policies?office=${officeId}`
      : "/admin/policies";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {policy ? <input type="hidden" name="id" value={policy.id} /> : null}
      <input type="hidden" name="doctor_office_id" value={officeId} />

      <Card>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="policy-office">
              Doctor office <span className="text-destructive">*</span>
            </Label>
            <Select value={officeId || undefined} onValueChange={setOfficeId}>
              <SelectTrigger id="policy-office" className="w-full">
                <SelectValue placeholder="Select a doctor office" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {offices.map((office) => (
                  <SelectItem key={office.id} value={office.id}>
                    {office.name ?? "Unnamed office"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The office this policy applies to. Only its users see it.
            </p>
          </div>

          {isNew ? (
            <div className="grid gap-2">
              <Label htmlFor="policy-source">
                <Copy className="size-4" />
                Copy from an existing policy
              </Label>
              <Select value={sourceId} onValueChange={pickSource}>
                <SelectTrigger id="policy-source" className="w-full">
                  <SelectValue placeholder="Start from scratch" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value={NO_SOURCE}>Start from scratch</SelectItem>
                  {sourceGroups.map(([officeName, group]) => (
                    <SelectGroup key={officeName}>
                      <SelectLabel>{officeName}</SelectLabel>
                      {group.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.label} · {source.companyIds.length} companies,{" "}
                          {source.medicineIds.length} medicines
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Loads that policy&apos;s companies and medicines into the form below,
                replacing what is ticked. Nothing is saved until you do — edit
                the copy freely.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <PickerList
            label="Insurance companies"
            icon={<Building2 className="size-4 text-muted-foreground" />}
            name="insurance_company_ids"
            items={companies.map((company) => ({
              id: company.id,
              name: company.name,
              type: company.insurance_type,
            }))}
            selected={selectedCompanies}
            onChange={setSelectedCompanies}
            searchPlaceholder="Search companies"
            emptyText="There are no insurance companies yet."
          />

          <div className="sm:border-l sm:pl-6">
            <PickerList
              label="Medicines"
              icon={<Pill className="size-4 text-muted-foreground" />}
              name="medicine_ids"
              items={medicines.map((medicine) => ({
                id: medicine.id,
                name: medicine.name,
                type: medicine.medicine_type,
                backgroundColor: medicine.background_color,
                textColor: medicine.text_color,
              }))}
              selected={selectedMedicines}
              onChange={setSelectedMedicines}
              searchPlaceholder="Search medicines"
              emptyText="There are no medicines yet."
            />
          </div>
        </CardContent>
      </Card>

      {state && "error" in state ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Separator />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <p className="mr-auto text-sm text-muted-foreground">
          {selectedCompanies.size} compan
          {selectedCompanies.size === 1 ? "y" : "ies"} ·{" "}
          {selectedMedicines.size} medicine
          {selectedMedicines.size === 1 ? "" : "s"}
        </p>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(cancelHref)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || !officeId}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : isNew ? (
            "Create policy"
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}
