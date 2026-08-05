"use client";

import * as React from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { client } from "@/api/browser/client";
import { formatDate } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { updatePatient } from "../new/actions";
import type { PatientRow } from "./PatientsTable";

/** Formats an ISO timestamp as `dd.mm.yyyy, HH:MM`, falling back to the raw value. */
function formatDateTime(value: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return formatDate(value);
  const time = parsed.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatDate(value)}, ${time}`;
}

/** ISO date input needs a yyyy-mm-dd value; strip any time component. */
function toDateInputValue(value: string | null): string {
  if (!value) return "";
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function ReadOnlyRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-sm break-words font-mono">
        {value === null || value === undefined || value === "" ? (
          <span className="text-muted-foreground font-sans">—</span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

export function PatientDetailsDrawer({
  patient,
  open,
  onOpenChange,
}: {
  /** The patient whose details fill the drawer, or null when nothing is selected. */
  patient: PatientRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("component.PatientsTable");
  const [state, formAction, isPending] = useActionState(updatePatient, null);

  // Insurance companies for the select, fetched once on the client.
  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ["insurance_companies"],
    queryFn: async () => {
      const { data, error } = await client
        .from("insurance_companies")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Close the drawer once a save succeeds.
  React.useEffect(() => {
    if (state && "success" in state) {
      onOpenChange(false);
    }
  }, [state, onOpenChange]);

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="!w-[40vw] !max-w-[40vw]">
        <DrawerHeader className="border-b">
          <DrawerTitle>{t("details.title")}</DrawerTitle>
          <DrawerDescription>{t("details.subtitle")}</DrawerDescription>
        </DrawerHeader>

        {patient && (
          // `key` re-seeds the uncontrolled fields whenever a different
          // patient is opened without the drawer closing in between.
          <form
            key={patient.id}
            action={formAction}
            className="flex min-h-0 flex-1 flex-col"
          >
            <input type="hidden" name="id" value={patient.id} />

            <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
              {/* Personal details */}
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="last_name">
                    {t("details.last_name")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    defaultValue={patient.last_name ?? ""}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="first_name">
                    {t("details.first_name")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    defaultValue={patient.first_name ?? ""}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="date_of_birth">
                    {t("headers.date_of_birth")}{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    defaultValue={toDateInputValue(patient.date_of_birth)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="gender">{t("headers.gender")}</Label>
                  <Select name="gender" defaultValue={patient.gender ?? undefined}>
                    <SelectTrigger id="gender" className="w-full">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">male</SelectItem>
                      <SelectItem value="female">female</SelectItem>
                      <SelectItem value="other">other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </section>

              {/* Insurance */}
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="insurance_company_id">
                    {t("headers.insurance_company")}
                  </Label>
                  <Select
                    name="insurance_company_id"
                    defaultValue={patient.insurance_company_id ?? undefined}
                    disabled={companiesLoading}
                  >
                    <SelectTrigger id="insurance_company_id" className="w-full">
                      <SelectValue
                        placeholder={companiesLoading ? "Loading…" : "—"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="insurance_number">
                    {t("headers.insurance_number")}
                  </Label>
                  <Input
                    id="insurance_number"
                    name="insurance_number"
                    defaultValue={patient.insurance_number ?? ""}
                  />
                </div>
              </section>

              {/* Address */}
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="street">{t("headers.street")}</Label>
                  <Input
                    id="street"
                    name="street"
                    defaultValue={patient.street ?? ""}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="house_number">
                    {t("headers.house_number")}
                  </Label>
                  <Input
                    id="house_number"
                    name="house_number"
                    defaultValue={patient.house_number ?? ""}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="zipcode">{t("headers.zipcode")}</Label>
                  <Input
                    id="zipcode"
                    name="zipcode"
                    defaultValue={patient.zipcode ?? ""}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="city">{t("headers.city")}</Label>
                  <Input
                    id="city"
                    name="city"
                    defaultValue={patient.city ?? ""}
                  />
                </div>
              </section>

              {/* Read-only system fields */}
              <section className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
                <ReadOnlyRow label={t("details.uuid")} value={patient.id} />
                <ReadOnlyRow
                  label={t("details.directus_id")}
                  value={patient.directus_id}
                />
                <ReadOnlyRow
                  label={t("details.created_at")}
                  value={formatDateTime(patient.created_at) || null}
                />
              </section>

              {state && "error" in state ? (
                <p className="text-sm text-destructive">{state.error}</p>
              ) : null}
            </div>

            <DrawerFooter className="flex-row justify-end gap-2 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                {t("details.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t("details.saving")}
                  </>
                ) : (
                  t("details.save")
                )}
              </Button>
            </DrawerFooter>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  );
}
