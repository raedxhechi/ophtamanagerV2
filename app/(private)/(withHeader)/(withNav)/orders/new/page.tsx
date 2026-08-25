import { getOfficeContext } from "@/lib/office/context";

import { NewOrderForm } from "./_components/NewOrderForm";

/**
 * A server shell around the create-order form, for one reason: the office being
 * worked in is a server read, and the form needs it before it fetches anything.
 * It scopes the patient picker and the insurance policies, and it is the office
 * the order lands in.
 *
 * Passed as undefined rather than null when there is none, so the form's
 * "office unknown, let the column default decide" path is the one that runs —
 * which is what a single-office user has always relied on.
 */
export default async function NewOrderPage() {
  const { officeId } = await getOfficeContext();

  return <NewOrderForm doctorOfficeId={officeId ?? undefined} />;
}
