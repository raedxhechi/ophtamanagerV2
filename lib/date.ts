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

/**
 * Format a timestamp as dd.mm.yyyy, HH:MM for display. Date and time are both
 * read off the same parsed instant so they can't disagree across a timezone
 * boundary. Values with no time component fall back to formatDate.
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";

  // Date-only values (and dd.mm.yyyy) carry no time to show, and parsing them
  // as a Date would shift the day in negative-UTC-offset timezones.
  if (DDMMYYYY.test(value) || !/\d{2}:\d{2}/.test(value)) return formatDate(value);

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return formatDate(value);

  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  // Pinned to de-DE for a 24-hour HH:MM, matching the fixed dd.mm.yyyy date
  // and keeping server-rendered output identical to the client's.
  const time = parsed.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dd}.${mm}.${parsed.getFullYear()}, ${time}`;
}
