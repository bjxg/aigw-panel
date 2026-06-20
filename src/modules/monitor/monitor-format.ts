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
 * Parses a per-hour bucket key and returns a Date in the local time zone.
 * Returns null if the string cannot be parsed.
 */
export const parseHourBucketDate = (raw: string): Date | null => {
  if (!raw) return null;
  // Normalize: "2026-06-20 11:00" -> "2026-06-20T11:00"
  //            "2026-06-20T11:00:00+08:00" -> already ISO
  const normalized = raw.includes("T") || raw.includes("+") || raw.endsWith("Z")
    ? raw
    : raw.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};
