import { formatNumber } from "@/modules/monitor/monitor-utils";

export const formatCompact = (value: number): string => {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);

  const compact = (divisor: number, suffix: string) => {
    const raw = value / divisor;
    const fixed = raw.toFixed(1);
    const trimmed = fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
    return `${trimmed}${suffix}`;
  };

  if (abs >= 1_000_000_000) return compact(1_000_000_000, "b");
  if (abs >= 1_000_000) return compact(1_000_000, "m");
  if (abs >= 1_000) return compact(1_000, "k");
  return formatNumber(value);
};

export const formatLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatMonthDay = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}`;
};

/**
 * Parses a per-hour bucket key returned by the backend and returns a
 * canonical `HH:00` label.
 *
 * The backend format depends on the active database driver:
 *   - SQLite:   "2026-06-20 11:00"        (space separator)
 *   - Postgres: "2026-06-20T11:00:00+08:00" (ISO-8601, "T" separator, tz suffix)
 *
 * We extract the hour component with a regex so both formats work, and fall
 * back to the raw input if it doesn't look like a recognisable hour bucket.
 */
export const parseHourBucketLabel = (raw: string): string => {
  if (!raw) return "";
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return raw;
  return `${match[1].padStart(2, "0")}:00`;
};

/**
 * Parses a per-hour bucket key and returns a Date. The result is in the
 * local time zone when the input has no timezone offset, otherwise the
 * offset is honoured.
 *
 * Accepts:
 *   - SQLite:   "2026-06-20 11:00"          (naive local time)
 *   - Postgres: "2026-06-20T11:00:00+08:00" (tz-aware)
 *   - Postgres: "2026-06-20T03:00:00Z"      (UTC, "Z" suffix)
 *
 * Returns null if the string cannot be parsed.
 */
export const parseHourBucketDate = (raw: string): Date | null => {
  if (!raw) return null;
  let normalized = raw;
  // "2026-06-20 11:00" -> "2026-06-20T11:00:00"
  if (!normalized.includes("T") && !normalized.includes("+") && !normalized.endsWith("Z")) {
    normalized = normalized.replace(" ", "T") + ":00";
  } else if (
    normalized.includes("T") &&
    !/[Zz]|[+-]\d{2}:?\d{2}$/.test(normalized)
  ) {
    // "2026-06-20T11:00" with no seconds/offset -> append ":00" so JS parses
    // it as local time rather than treating it as ISO with missing seconds.
    normalized = normalized + ":00";
  }
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Formats a Date as `HH:00` in the local time zone.
 */
export const formatHourLabel = (date: Date): string => {
  const hh = String(date.getHours()).padStart(2, "0");
  return `${hh}:00`;
};

/**
 * Formats a Date as `MM-DD HH:00` in the local time zone. Used when the
 * window can span multiple days so adjacent same-hour labels stay readable.
 */
export const formatMonthDayHourLabel = (date: Date): string => {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:00`;
};
