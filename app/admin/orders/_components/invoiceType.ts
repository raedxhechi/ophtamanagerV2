import type { InvoiceType } from "@/types";

/**
 * The invoice-type options for the suborder selects, and the sentinel that
 * stands in for "none" — Radix rejects an empty item value, and an empty select
 * would otherwise be indistinguishable from an untouched one.
 *
 * Lives apart from `../actions` because a "use server" module may only export
 * async functions, and both the form and the action need these.
 */
export const NO_INVOICE_TYPE = "__none__";

export const INVOICE_TYPES: InvoiceType[] = ["Praxis", "Kasse", "Patient"];
