/**
 * The date ranges behind the dashboard cards and the day's order list.
 *
 * Everything is anchored to the clinic's calendar rather than the server's: a
 * host running in UTC would start "today" one or two hours late and file every
 * order created just after midnight in Germany under the previous day.
 */

const TIME_ZONE = "Europe/Berlin";

/** A half-open [from, to) window, as timestamptz literals Postgres accepts. */
export type Range = { from: string; to: string };

export type DashboardRanges = {
  /** Start of the current local day — anything at or after it was created today. */
  todayStart: string;
  /** Monday 00:00 through now. */
  week: Range;
  /** The 1st of the month 00:00 through now. */
  month: Range;
  /**
   * The same elapsed span of the previous week / month. A part-elapsed week
   * compared against a whole one would always read as a decline, so each
   * comparison window runs the same distance from its own start.
   */
  previousWeek: Range;
  previousMonth: Range;
};

/** The calendar date (yyyy-mm-dd) an instant falls on in {@link TIME_ZONE}. */
function localDate(instant: Date): string {
  // en-CA formats as yyyy-mm-dd, which is the shape every helper here expects.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/**
 * The instant a local calendar day begins, e.g. "2026-08-23T00:00:00+02:00".
 *
 * The offset is read at 00:00 UTC on that date, which in Germany is 01:00 or
 * 02:00 local — past midnight, but before the 03:00 daylight-saving switch — so
 * it is the offset actually in force at the midnight being described, on both
 * of the two days a year where those differ.
 */
function startOfDay(date: string): string {
  const zoneName = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    timeZoneName: "longOffset",
  })
    .formatToParts(new Date(`${date}T00:00:00Z`))
    .find((part) => part.type === "timeZoneName");
  // "GMT+02:00" -> "+02:00"; plain "GMT" (no offset) means UTC.
  const offset = zoneName?.value.replace("GMT", "") || "+00:00";
  return `${date}T00:00:00${offset}`;
}

/** Calendar arithmetic on yyyy-mm-dd, done in UTC so no offset creeps in. */
function shiftDays(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/** The first of the month before the one `monthStart` (yyyy-mm-01) opens. */
function previousMonthStart(monthStart: string): string {
  const [year, month] = monthStart.split("-").map(Number);
  return month === 1
    ? `${year - 1}-12-01`
    : `${year}-${String(month - 1).padStart(2, "0")}-01`;
}

export function dashboardRanges(now: Date = new Date()): DashboardRanges {
  const today = localDate(now);
  const nowIso = now.toISOString();

  // Monday-first, matching the German working week: getUTCDay() is Sunday-first,
  // so +6 mod 7 turns it into how many days back the week started.
  const weekStart = shiftDays(
    today,
    -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7)
  );
  const monthStart = `${today.slice(0, 8)}01`;

  const weekFrom = startOfDay(weekStart);
  const monthFrom = startOfDay(monthStart);
  const previousWeekFrom = startOfDay(shiftDays(weekStart, -7));
  const previousMonthFrom = startOfDay(previousMonthStart(monthStart));

  const elapsedInto = (from: string) => now.getTime() - Date.parse(from);
  const spanFrom = (from: string, elapsed: number) =>
    new Date(Date.parse(from) + elapsed).toISOString();

  return {
    todayStart: startOfDay(today),
    week: { from: weekFrom, to: nowIso },
    month: { from: monthFrom, to: nowIso },
    previousWeek: {
      from: previousWeekFrom,
      to: spanFrom(previousWeekFrom, elapsedInto(weekFrom)),
    },
    previousMonth: {
      from: previousMonthFrom,
      to: spanFrom(previousMonthFrom, elapsedInto(monthFrom)),
    },
  };
}

/** A timestamp as HH:MM in the clinic's timezone. Empty for a missing value. */
export function localTime(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

/** Today's date, dd.mm.yyyy in the clinic's timezone — for the list heading. */
export function localToday(now: Date = new Date()): string {
  const [year, month, day] = localDate(now).split("-");
  return `${day}.${month}.${year}`;
}
