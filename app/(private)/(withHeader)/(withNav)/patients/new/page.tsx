import { getTranslations } from "next-intl/server";

import { NewPatientForm } from "./_components/NewPatientForm";

export default async function NewPatientPage() {
  const t = await getTranslations("component.NewPatientForm");

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
