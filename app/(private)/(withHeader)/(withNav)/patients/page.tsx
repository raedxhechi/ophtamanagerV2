import { createClient } from "@/supabase/server";

import { PatientsTable, type PatientRow } from "./_components/PatientsTable";

export default async function PatientsPage() {
  const supabase = await createClient();

  // RLS scopes this to the current user's office automatically.
  const { data, error } = await supabase
    .from("patients")
    .select("*, insurance_company:insurance_company_id(name)")
    .order("created_at", { ascending: false });

  const patients = (data ?? []) as PatientRow[];

  return (
    <div className="mx-auto w-full max-w-[96rem] p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Failed to load patients: {error.message}
        </p>
      ) : (
        <PatientsTable data={patients} />
      )}
    </div>
  );
}
