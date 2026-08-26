import { createClient } from "@/supabase/server";
import type { Database } from "@/types/supabase";

import { AdminPharmaciesTable } from "./AdminPharmaciesTable";

type PharmacyRow = Database["public"]["Tables"]["pharmacies"]["Row"];

/**
 * A doctor office as the pharmacy screen needs it: the office itself, plus the
 * pharmacy it is attached to today. `pharmacy_name` is what the drawer shows
 * next to an office that another pharmacy currently serves, so ticking it reads
 * as moving it rather than as a fresh assignment.
 */
export type PharmacyOfficeOption = {
  id: string;
  name: string | null;
  pharmacy_id: string | null;
  pharmacy_name: string | null;
};

export type AdminPharmacyRow = PharmacyRow & {
  /** The offices this pharmacy serves (doctor_office.pharmacy_id), by name. */
  offices: { id: string; name: string | null }[];
};

/**
 * The suspending half of the admin pharmacies page.
 *
 * Two tables, joined the other way round from how the schema stores the link:
 * `pharmacy_id` sits on doctor_office (one pharmacy, many offices), and this
 * screen is the pharmacy's side of it, so the offices are grouped onto their
 * pharmacy here rather than embedded in the select.
 *
 * Every signed-in user may read pharmacies now, so no admin check gates the
 * read — proxy.ts is what keeps non-admins out of /admin, and the update policy
 * is what refuses a write from anyone else.
 */
export async function AdminPharmaciesData() {
  const supabase = await createClient();

  const [pharmaciesResult, officesResult] = await Promise.all([
    supabase.from("pharmacies").select("*").order("name"),
    supabase
      .from("doctor_office")
      .select("id, name, pharmacy_id")
      .order("name"),
  ]);

  if (pharmaciesResult.error) {
    return (
      <p className="text-destructive text-sm">
        Failed to load pharmacies: {pharmaciesResult.error.message}
      </p>
    );
  }

  if (officesResult.error) {
    return (
      <p className="text-destructive text-sm">
        Failed to load doctor offices: {officesResult.error.message}
      </p>
    );
  }

  const pharmacies = pharmaciesResult.data ?? [];
  const officeRows = officesResult.data ?? [];
  const pharmacyNames = new Map(pharmacies.map((p) => [p.id, p.name]));

  const offices: PharmacyOfficeOption[] = officeRows.map((office) => ({
    id: office.id,
    name: office.name,
    pharmacy_id: office.pharmacy_id,
    pharmacy_name: office.pharmacy_id
      ? (pharmacyNames.get(office.pharmacy_id) ?? null)
      : null,
  }));

  const rows: AdminPharmacyRow[] = pharmacies.map((pharmacy) => ({
    ...pharmacy,
    // In the office list's own order, which is by name — the same order the
    // drawer's checkboxes and the table's badge both read them in.
    offices: offices
      .filter((office) => office.pharmacy_id === pharmacy.id)
      .map(({ id, name }) => ({ id, name })),
  }));

  // The default first: it is the one this project actually runs on, and the one
  // the "add a pharmacy" drawer sends people back to.
  rows.sort((a, b) => {
    if (a.default_pharmacy !== b.default_pharmacy) {
      return a.default_pharmacy ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return <AdminPharmaciesTable data={rows} offices={offices} />;
}
