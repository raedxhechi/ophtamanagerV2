import { Building2, Pill } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";

import type { DetailRow } from "./EntitySheet";
import type { UserDataWithOffice } from "@/types/user";

import { getPolicyImageUrl } from "@/lib/policyImage";
import { createClient } from "@/supabase/server";

import { EntitySheet } from "./EntitySheet";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { UserNav } from "./UserNav";

// Pharmacy has no entity in the schema yet — still dummy data.
const pharmacy = {
  name: "St. Alexius Apotheke",
  email: "Alexianerplatz 1a, 41464 Neuss",
  phone: "+49 30 7654 321",
};

interface SiteHeaderProps {
  user: User;
  userData: UserDataWithOffice | null;
}

export async function SiteHeader({ user, userData }: SiteHeaderProps) {
  const t = await getTranslations("header");
  const office = userData?.doctor_office;

  const doctorOfficeRows: DetailRow[] = [
    { label: t("fields.name"), value: office?.name ?? "—" },
    { label: t("fields.email"), value: office?.email ?? "—" },
    { label: t("fields.phone"), value: office?.phone_number ?? "—" },
  ];

  // The insurance policy image, uploaded by an admin under /admin/policies.
  // One image covers every office today, so no office id is passed; handing it
  // `office?.id` is all that's needed once each office has its own (the
  // resolver prefers the office's and falls back to the shared one).
  const supabase = await createClient();
  const policyImageUrl = await getPolicyImageUrl(supabase);

  const pharmacyRows: DetailRow[] = [
    { label: t("fields.name"), value: pharmacy.name },
    { label: t("fields.email"), value: pharmacy.email },
    { label: t("fields.phone"), value: pharmacy.phone },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/15 bg-gradient-to-r from-blue-600/85 via-sky-500/80 to-blue-600/85 text-white shadow-lg shadow-blue-950/20 backdrop-blur-xl before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/30 relative">
      <div className="mx-auto flex h-20 w-full max-w-[96rem] items-center justify-between gap-4 px-6 py-5 lg:px-10">
        {/* 1. Logo area */}
        <Logo />

        {/* 2. Doctor office — info button opens a details sidebar */}
        <EntitySheet
          name={office?.name ?? t("noOffice")}
          icon={<Building2 className="size-4" />}
          title={t("doctorOffice")}
          description={t("doctorOfficeDetails")}
          rows={doctorOfficeRows}
          image={
            policyImageUrl
              ? { url: policyImageUrl, label: t("policyImage") }
              : null
          }
        />

        {/* 3. Pharmacy — info button opens a details sidebar */}
        <EntitySheet
          name={pharmacy.name}
          icon={<Pill className="size-4" />}
          title={t("pharmacy")}
          description={t("pharmacyDetails")}
          rows={pharmacyRows}
        />

        {/* 4. Language switcher + user nav */}
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <UserNav user={user} role={userData?.role ?? null} />
        </div>
      </div>
    </header>
  );
}
