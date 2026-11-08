// Timezone-aware day/hour boundaries.
//
// The server runs UTC, but streaks, the "already logged today" guard, and quiet
// hours are human-facing: they must be computed in the person's own local day.
// These helpers turn an absolute instant into a local calendar day or hour for a
// given IANA timezone, so none of the gameplay logic uses `new Date().getHours()`
// or a UTC midnight boundary again.

// App default when a user has no stored timezone yet (the column is nullable
// through the WP9 tenancy work). Troy's audience is Eastern; this keeps day
// boundaries sensible until a real timezone is captured per user.
export const DEFAULT_TIMEZONE = "America/New_York";

/** True if `tz` is a resolvable IANA timezone string. */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The timezone to use: the stored one if valid, else the app default. */
export function resolveTimezone(tz: string | null | undefined): string {
  return tz && isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;
}

/**
 * The local calendar day of `instant` in `tz`, as an `YYYY-MM-DD` string.
 * `en-CA` formats dates in ISO order, so this is stable to compare and to step.
 * An unresolvable timezone falls back to the UTC day rather than throwing.
 */
export function localDay(instant: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(instant);
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}

/**
 * The local hour-of-day (0-23) of `instant` in `tz`. Used for quiet hours.
 * `hour12: false` can emit "24" for midnight in some runtimes; normalize to 0.
 */
export function localHour(instant: Date, tz: string): number {
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      hour12: false,
    }).format(instant);
    const hour = parseInt(formatted, 10);
    return Number.isNaN(hour) ? instant.getUTCHours() : hour % 24;
  } catch {
    return instant.getUTCHours();
  }
}

/**
 * The calendar day immediately before `dayStr` (an `YYYY-MM-DD` string).
 * Anchored at noon UTC so a one-day step never lands on the wrong side of a
 * daylight-saving transition. Day-granular, so the chosen hour is irrelevant.
 */
export function previousDay(dayStr: string): string {
  const anchored = new Date(`${dayStr}T12:00:00Z`);
  anchored.setUTCDate(anchored.getUTCDate() - 1);
  return anchored.toISOString().slice(0, 10);
}
