import { NewPatientForm } from "./_components/NewPatientForm";

export default function NewPatientPage() {
  return (
    <div className="mx-auto w-full max-w-3xl p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">New patient</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a new patient to your doctor office.
        </p>
      </div>
      <NewPatientForm />
    </div>
  );
}
