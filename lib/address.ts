/**
 * "Alexianerplatz 1a, 41464 Neuss" — as much of it as the row actually has.
 *
 * Every part is nullable and some of the migrated data carries stray whitespace
 * (the one pharmacy zipcode in the table ends in a space), so this drops the
 * empty pieces rather than printing their separators. Structurally typed
 * because the four columns are the same four wherever they appear — pharmacies,
 * doctor offices, patients — and an address is not any of their business.
 */
export function addressLine(address: {
  street: string | null;
  house_number: string | null;
  zipcode: string | null;
  city: string | null;
}): string {
  const street = [address.street, address.house_number]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  const town = [address.zipcode, address.city]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return [street, town].filter(Boolean).join(", ");
}
