import {
  PatientsPageShell,
  PatientsTableFallback,
} from "./_components/PatientsPageShell";

/**
 * Shown the moment the user navigates to /patients, while the page's query
 * runs. Without this boundary the router keeps the previous page on screen
 * until the whole server render resolves, which reads as the app freezing.
 */
export default function Loading() {
  return (
    <PatientsPageShell>
      <PatientsTableFallback />
    </PatientsPageShell>
  );
}
