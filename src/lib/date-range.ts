/**
 * Shared date-range selection model used by the dashboard / monitor /
 * request-logs pages. Preset ranges map to the backend `days` parameter;
 * "yesterday" and custom ranges map to explicit `start`/`end` (YYYY-MM-DD)
 * query params.
 */

export type PresetRangeKey = "today" | "yesterday" | "7d" | "14d" | "30d";

export type RangeSelection =
  | { kind: "preset"; preset: PresetRangeKey }
  | { kind: "custom"; start: string; end: string };

export interface RangeQuery {
  days?: number;
  start?: string;
  end?: string;
}

const pad2 = (value: number): string => String(value).padStart(2, "0");

/** Format a Date as a local YYYY-MM-DD string. */
export function formatYMD(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Parse a YYYY-MM-DD string into a local Date (00:00). Returns null when invalid. */
export function parseYMD(value: string): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }
  return date;
}

/** Yesterday's date as a local YYYY-MM-DD string. */
export function yesterdayYMD(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return formatYMD(date);
}

/** Days covered by a preset; null for "yesterday" (resolved to start/end instead). */
export function presetDays(preset: PresetRangeKey): number | null {
  switch (preset) {
    case "today":
      return 1;
    case "7d":
      return 7;
    case "14d":
      return 14;
    case "30d":
      return 30;
    case "yesterday":
      return null;
  }
}

/** Convert a selection into backend query parameters. */
export function resolveRangeQuery(selection: RangeSelection): RangeQuery {
  if (selection.kind === "custom") {
    return { start: selection.start, end: selection.end };
  }
  if (selection.preset === "yesterday") {
    const yesterday = yesterdayYMD();
    return { start: yesterday, end: yesterday };
  }
  return { days: presetDays(selection.preset) ?? 7 };
}

/** Number of local days covered by the selection (for hints / bucket sizing). */
export function rangeDayCount(selection: RangeSelection): number {
  if (selection.kind === "custom") {
    const start = parseYMD(selection.start);
    const end = parseYMD(selection.end);
    if (start && end) {
      return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
    }
    return 1;
  }
  if (selection.preset === "yesterday") return 1;
  return presetDays(selection.preset) ?? 7;
}

/**
 * For range-based selections, returns the local Date of the exclusive range
 * end (i.e. the day after `end`, 00:00) used to anchor hourly charts.
 * Returns null for day-based presets (anchor to "now" instead).
 */
export function rangeAnchorEndLocal(selection: RangeSelection): Date | null {
  if (selection.kind === "custom") {
    const end = parseYMD(selection.end);
    if (!end) return null;
    end.setDate(end.getDate() + 1);
    return end;
  }
  if (selection.preset === "yesterday") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }
  return null;
}
