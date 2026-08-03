const DDMMYYYY = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const ISO = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Format any date value to dd.mm.yyyy for display.
 * Accepts a dd.mm.yyyy string (returned as-is), an ISO string (yyyy-mm-dd,
 * optionally with time), or any Date-parseable string. Returns "" when empty.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "";

  if (DDMMYYYY.test(value)) return value;

  // Parse ISO explicitly so we never hit timezone-shift bugs from `new Date`.
  const iso = value.match(ISO);
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    const dd = String(parsed.getDate()).padStart(2, "0");
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    return `${dd}.${mm}.${parsed.getFullYear()}`;
  }

  return value;
}
