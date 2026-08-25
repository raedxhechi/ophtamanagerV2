import { getTranslations } from "next-intl/server";

import { NoOfficeSelected } from "@/components/no-office-selected";
import { getOfficeContext } from "@/lib/office/context";

import { NewPatientForm } from "./_components/NewPatientForm";

export default async function NewPatientPage() {
  const t = await getTranslations("component.NewPatientForm");
  const { officeId, canSwitch } = await getOfficeContext();

  // Every patient belongs to an office, and createPatient refuses without one.
  // Better to say so before the form is filled in than after it is submitted.
  if (canSwitch && !officeId) {
    return (
      <NoOfficeSelected description="Pick a doctor office in the header before adding a patient — it decides which office the patient belongs to." />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <NewPatientForm />
    </div>
  );
}
