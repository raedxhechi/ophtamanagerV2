import { Building2, Pill } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";

import type { DetailRow } from "./EntitySheet";
import type { UserDataWithOffice } from "@/types/user";

import { getOfficeContext } from "@/lib/office/context";
import { getPharmacyForOffice, pharmacyAddressLine } from "@/lib/pharmacy";
import { getPolicyImageUrl } from "@/lib/policyImage";
import { createClient } from "@/supabase/server";

import { AdminButton } from "./AdminButton";
import { EntitySheet } from "./EntitySheet";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Logo } from "./Logo";
import { OfficeSetupDialog } from "./OfficeSetupDialog";
import { OfficeSwitcher } from "./OfficeSwitcher";
import { UserNav } from "./UserNav";

interface SiteHeaderProps {
  user: User;
  userData: UserDataWithOffice | null;
}

export async function SiteHeader({ user, userData }: SiteHeaderProps) {
  const t = await getTranslations("header");

  // The office being worked in, which for an admin or a manager is the one they
  // picked rather than the one on their profile. Cached per request, so the
  // page rendering below this header shares the same read.
  const { office, options, canSwitch } = await getOfficeContext();

  const doctorOfficeRows: DetailRow[] = [
    { label: t("fields.name"), value: office?.name ?? "—" },
    { label: t("fields.email"), value: office?.email ?? "—" },
    { label: t("fields.phone"), value: office?.phone_number ?? "—" },
  ];

  const supabase = await createClient();

  // Two independent reads for the same header, so they go together:
  //
  // - The insurance policy image, uploaded by an admin under /admin/policies.
  //   One image covers every office today, so no office id is passed; handing it
  //   `office?.id` is all that's needed once each office has its own (the
  //   resolver prefers the office's and falls back to the shared one).
  // - The pharmacy that fills this office's orders. Null only if the project has
  //   no pharmacy at all — every office is attached to one, and the resolver
  //   falls back to the default for a user who has not picked an office yet.
  const [policyImageUrl, pharmacy] = await Promise.all([
    getPolicyImageUrl(supabase),
    getPharmacyForOffice(supabase, office?.pharmacy_id),
  ]);

  const pharmacyRows: DetailRow[] = [
    { label: t("fields.name"), value: pharmacy?.name ?? "—" },
    { label: t("fields.contactPerson"), value: pharmacy?.contact_person ?? "—" },
    { label: t("fields.phone"), value: pharmacy?.phone_number ?? "—" },
    {
      label: t("fields.address"),
      value: pharmacy ? pharmacyAddressLine(pharmacy) : "—",
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/15 bg-gradient-to-r from-blue-600/85 via-sky-500/80 to-blue-600/85 text-white shadow-lg shadow-blue-950/20 backdrop-blur-xl before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/30 relative">
      <div className="mx-auto flex h-20 w-full max-w-[96rem] items-center justify-between gap-4 px-6 py-5 lg:px-10">
        {/* 1. Logo area — admins get a way back to /admin next to it */}
        <div className="flex items-center gap-4">
          <Logo />
          {userData?.role === "admin" ? (
            <AdminButton label={t("admin")} />
          ) : null}
        </div>

        {/* 2. Doctor office — info button opens a details sidebar, and for an
               admin or a manager the label itself switches office */}
        <EntitySheet
          name={office?.name ?? t("noOffice")}
          nameSlot={
            canSwitch ? (
              <OfficeSwitcher
                options={options.map(({ id, name }) => ({ id, name }))}
                selectedId={office?.id ?? null}
                icon={<Building2 className="size-4" />}
                label={t("switchOffice")}
                emptyLabel={t("noOffice")}
              />
            ) : undefined
          }
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
          name={pharmacy?.name ?? t("noPharmacy")}
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

      {/* First run: an admin or manager who has never picked an office sees
          empty lists everywhere, because the app has no way to know which
          office they mean. Ask, rather than choose one for them. */}
      {canSwitch && !office ? <OfficeSetupDialog options={options} /> : null}
    </header>
  );
}
