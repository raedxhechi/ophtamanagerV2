import { Building2, Pill } from "lucide-react";

import { EntitySheet, type DetailRow } from "./EntitySheet";
import { Logo } from "./Logo";
import { UserNav } from "./UserNav";

// Dummy data — wired to real data later.
const doctorOffice: { name: string; rows: DetailRow[] } = {
  name: "Praxis Dr. Müller",
  rows: [
    { label: "Name", value: "Praxis Dr. Müller" },
    { label: "Email", value: "kontakt@praxis-mueller.de" },
    { label: "Phone", value: "+49 30 1234 567" },
  ],
};

const pharmacy: { name: string; rows: DetailRow[] } = {
  name: "Stadt Apotheke",
  rows: [
    { label: "Name", value: "Stadt Apotheke" },
    { label: "Email", value: "info@stadt-apotheke.de" },
    { label: "Phone", value: "+49 30 7654 321" },
  ],
};

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/15 bg-gradient-to-r from-blue-600/85 via-sky-500/80 to-blue-600/85 text-white shadow-lg shadow-blue-950/20 backdrop-blur-xl before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/30 relative">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6 py-3 lg:px-10">
        {/* 1. Logo area */}
        <Logo />

        {/* 2. Doctor office — opens a details sidebar */}
        <EntitySheet
          name={doctorOffice.name}
          icon={<Building2 className="size-4" />}
          title="Doctor office"
          description="Practice details"
          rows={doctorOffice.rows}
        />

        {/* 3. Pharmacy — opens a details sidebar */}
        <EntitySheet
          name={pharmacy.name}
          icon={<Pill className="size-4" />}
          title="Pharmacy"
          description="Pharmacy details"
          rows={pharmacy.rows}
        />

        {/* 4. User nav */}
        <UserNav />
      </div>
    </header>
  );
}
