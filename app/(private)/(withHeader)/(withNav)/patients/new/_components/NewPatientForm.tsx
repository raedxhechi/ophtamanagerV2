"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { client } from "@/api/browser/client";
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

import type { InsuranceType } from "@/types";

import { createPatient } from "../actions";

const INSURANCE_TYPES: InsuranceType[] = ["Gesetzlich", "Privat"];

export function NewPatientForm() {
  const t = useTranslations("component.NewPatientForm");
  const [state, formAction, isPending] = useActionState(createPatient, null);

  // Filters the company list below; not part of the submitted patient.
  const [insuranceType, setInsuranceType] = useState<InsuranceType | "">("");
  const [companyId, setCompanyId] = useState("");

  // Fetched on the client, after the page is already displayed.
  const {
    data: companies,
    isLoading: companiesLoading,
    isError: companiesError,
  } = useQuery({
    queryKey: ["insurance_companies"],
    queryFn: async () => {
      const { data, error } = await client
        .from("insurance_companies")
        .select("id, name, insurance_type")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredCompanies =
    insuranceType === ""
      ? []
      : (companies ?? []).filter(
          (company) => company.insurance_type === insuranceType
        );

  return (
    <form action={formAction} className="space-y-8">
      {/* Personal details */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="first_name">
            {t("fields.first_name")} <span className="text-destructive">*</span>
          </Label>
          <Input id="first_name" name="first_name" required />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="last_name">
            {t("fields.last_name")} <span className="text-destructive">*</span>
          </Label>
          <Input id="last_name" name="last_name" required />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="date_of_birth">
            {t("fields.date_of_birth")}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input id="date_of_birth" name="date_of_birth" type="date" required />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="gender">{t("fields.gender.label")}</Label>
          <Select name="gender">
            <SelectTrigger id="gender" className="w-full">
              <SelectValue placeholder={t("fields.gender.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">{t("fields.gender.male")}</SelectItem>
              <SelectItem value="female">{t("fields.gender.female")}</SelectItem>
              <SelectItem value="other">{t("fields.gender.other")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Insurance */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="insurance_type">
            {t("fields.insurance_type.label")}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Select
            value={insuranceType}
            onValueChange={(value) => {
              setInsuranceType(value as InsuranceType);
              // The previously picked company may belong to the other type.
              setCompanyId("");
            }}
          >
            <SelectTrigger id="insurance_type" className="w-full">
              <SelectValue placeholder={t("fields.insurance_type.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {INSURANCE_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {/* The value stays the Postgres enum; only the label is
                      translated. */}
                  {t(`fields.insurance_type.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="insurance_company_id">
              {t("fields.insurance_company.label")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            {companiesLoading ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                {t("loading")}
              </span>
            ) : null}
          </div>
          {/* Required: Directus mirrors every patient and its insuranceCompany
              column is NOT NULL, so a patient saved without one cannot be
              copied across. See directus/mirror.ts. */}
          <Select
            name="insurance_company_id"
            required
            value={companyId}
            onValueChange={setCompanyId}
            disabled={companiesLoading || insuranceType === ""}
          >
            <SelectTrigger id="insurance_company_id" className="w-full">
              <SelectValue
                placeholder={
                  companiesError
                    ? t("fields.insurance_company.placeholderError")
                    : companiesLoading
                      ? t("loading")
                      : insuranceType === ""
                        ? t("fields.insurance_company.placeholderNoType")
                        : t("fields.insurance_company.placeholder")
                }
              />
            </SelectTrigger>
            <SelectContent>
              {filteredCompanies.length === 0 ? (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">
                  {t("fields.insurance_company.empty")}
                </p>
              ) : (
                filteredCompanies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="insurance_number">
            {t("fields.insurance_number")}
          </Label>
          <Input id="insurance_number" name="insurance_number" />
        </div>
      </section>

      {/* Address */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="street">{t("fields.street")}</Label>
          <Input id="street" name="street" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="house_number">{t("fields.house_number")}</Label>
          <Input id="house_number" name="house_number" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="zipcode">{t("fields.zipcode")}</Label>
          <Input id="zipcode" name="zipcode" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="city">{t("fields.city")}</Label>
          <Input id="city" name="city" />
        </div>
      </section>

      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {t("submitting")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
        <Button asChild variant="ghost" type="button">
          <Link href="/patients">{t("cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}
