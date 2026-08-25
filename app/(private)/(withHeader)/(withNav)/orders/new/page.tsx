import { NoOfficeSelected } from "@/components/no-office-selected";
import { getOfficeContext } from "@/lib/office/context";

import { NewOrderForm } from "./_components/NewOrderForm";

/**
 * A server shell around the create-order form, for one reason: the office being
 * worked in is a server read, and the form needs it before it fetches anything.
 * It scopes the patient picker and the insurance policies, and it is the office
 * the order lands in.
 */
export default async function NewOrderPage() {
  const { officeId, canSwitch } = await getOfficeContext();

  // An admin or manager who has not picked an office cannot create here: they
  // have no office of their own for the column default to fall back on, so the
  // insert would fail the not-null constraint after the whole form was filled
  // in. Ask first — the header dialog is already asking.
  if (canSwitch && !officeId) {
    return (
      <NoOfficeSelected description="Pick a doctor office in the header before creating an order — it decides which office the order belongs to." />
    );
  }

  // Undefined rather than null for a single-office user, so the form's "office
  // unknown, let the column default decide" path is the one that runs — which
  // is what they have always relied on.
  return <NewOrderForm doctorOfficeId={officeId ?? undefined} />;
}
