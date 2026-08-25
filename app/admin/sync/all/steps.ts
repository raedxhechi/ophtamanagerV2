import type { SyncOverview } from "../actions";

/** One step of the full sync. */
export type SyncStep = {
  /** URL segment: POST /admin/sync/all/stream/<slug> runs exactly this step. */
  slug: string;
  label: string;
  /** Which overview card this step fills. */
  card: keyof SyncOverview;
};

/**
 * The order the entities have to be copied in, and why it is not negotiable.
 *
 * Every step resolves its foreign keys against rows the previous ones created,
 * so running them out of order does not fail loudly — it succeeds with the
 * links missing, and only a re-run repairs them:
 *
 *   doctor offices        nothing depends on them; everything else points here
 *   insurance companies   patients and policies reference them
 *   medicines             policies and orders reference them
 *   insurance policies    needs offices, medicines and companies to exist
 *   patients              need an office and an insurance company
 *   orders & suborders    need an office, a medicine and their patients
 *
 * Orders come last for the additional reason that a suborder whose patient was
 * never imported is the one broken link the orders importer reports in detail.
 *
 * This module is deliberately data only — no importers, no server imports — so
 * the browser can hold the same list the server dispatches on. The client walks
 * it one request at a time; see runners.ts for what each slug actually runs.
 */
export const SYNC_STEPS: SyncStep[] = [
  { slug: "doctor-offices", label: "Doctor offices", card: "doctorOffices" },
  {
    slug: "insurance-companies",
    label: "Insurance companies",
    card: "insuranceCompanies",
  },
  { slug: "medicines", label: "Medicines", card: "medicines" },
  {
    slug: "insurance-policies",
    label: "Insurance policies",
    card: "insurancePolicies",
  },
  { slug: "patients", label: "Patients", card: "patients" },
  { slug: "orders", label: "Orders & suborders", card: "orders" },
];
