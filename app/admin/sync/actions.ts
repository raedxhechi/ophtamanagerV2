"use server";

import { aggregate } from "@directus/sdk";

import { createDirectusServerClient } from "@/directus/server";
import { createClient } from "@/supabase/server";

import type { SyncCounts } from "./types";

export type SyncOverview = {
  patients: SyncCounts;
  doctorOffices: SyncCounts;
  medicines: SyncCounts;
  insuranceCompanies: SyncCounts;
  insurancePolicies: SyncCounts;
  orders: SyncCounts;
};

/** Directus + Supabase row counts for every synced table, for the overview. */
export async function getSyncOverview(): Promise<SyncOverview> {
  const directus = createDirectusServerClient();
  const supabase = await createClient();

  const directusCount = async (collection: string) => {
    const agg = (await directus.request(
      aggregate(collection, { aggregate: { count: "*" } })
    )) as Array<{ count: string | number | null }>;
    return Number(agg?.[0]?.count ?? 0);
  };

  const supabaseCount = async (
    table:
      | "patients"
      | "doctor_office"
      | "medicine"
      | "insurance_companies"
      | "insurance_policy"
      | "orders"
  ) => {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return count ?? 0;
  };

  const [
    patientsD,
    officesD,
    medicinesD,
    companiesD,
    policiesD,
    ordersD,
    patientsS,
    officesS,
    medicinesS,
    companiesS,
    policiesS,
    ordersS,
  ] = await Promise.all([
    directusCount("patients"),
    directusCount("doctorOffice"),
    directusCount("medicines"),
    directusCount("insuranceCompanies"),
    directusCount("insurancePolicies"),
    directusCount("orders"),
    supabaseCount("patients"),
    supabaseCount("doctor_office"),
    supabaseCount("medicine"),
    supabaseCount("insurance_companies"),
    supabaseCount("insurance_policy"),
    supabaseCount("orders"),
  ]);

  return {
    patients: { directus: patientsD, supabase: patientsS },
    doctorOffices: { directus: officesD, supabase: officesS },
    medicines: { directus: medicinesD, supabase: medicinesS },
    insuranceCompanies: { directus: companiesD, supabase: companiesS },
    insurancePolicies: { directus: policiesD, supabase: policiesS },
    orders: { directus: ordersD, supabase: ordersS },
  };
}
