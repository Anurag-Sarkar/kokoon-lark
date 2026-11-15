import { addDays, addWeeks, endOfDay, endOfWeek, format, isAfter, isSameDay, isSameWeek, isValid, parse, startOfDay, startOfWeek, subDays, subWeeks } from "date-fns";

export type Granularity = "week" | "day";

/** A day or a Monday-start week, resolved from URL params and safe to pass to client components. */
export interface Period {
  granularity: Granularity;
  /** YYYY-MM-DD of a day inside the period */
  anchor: string;
  startIso: string;
  endIso: string;
  /** "This week", "Last week", "Week of 3 Nov", "Today", "Yesterday", "Thu 6 Nov" */
  label: string;
  /** Extra detail shown muted next to the label, e.g. "10–16 Nov"; empty when the label already says it */
  rangeLabel: string;
  isCurrent: boolean;
  prevAnchor: string;
  nextAnchor: string | null;
}

const WEEK = { weekStartsOn: 1 as const };
const KEY = "yyyy-MM-dd";

function parseAnchor(raw: string, now: Date): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = parse(raw, KEY, now);
    if (isValid(d) && !isAfter(startOfDay(d), startOfDay(now))) return d;
  }
  return now;
}

export function resolvePeriod(granularityRaw: string, anchorRaw: string, now = new Date()): Period {
  const granularity: Granularity = granularityRaw === "day" ? "day" : "week";
  const anchor = parseAnchor(anchorRaw, now);

  if (granularity === "day") {
    const isCurrent = isSameDay(anchor, now);
    const yesterday = isSameDay(anchor, subDays(now, 1));
    return {
      granularity,
      anchor: format(anchor, KEY),
      startIso: startOfDay(anchor).toISOString(),
      endIso: endOfDay(anchor).toISOString(),
      label: isCurrent ? "Today" : yesterday ? "Yesterday" : format(anchor, "EEE d MMM"),
      rangeLabel: isCurrent || yesterday ? format(anchor, "EEE d MMM") : "",
      isCurrent,
      prevAnchor: format(subDays(anchor, 1), KEY),
      nextAnchor: isCurrent ? null : format(addDays(anchor, 1), KEY),
    };
  }

  const start = startOfWeek(anchor, WEEK);
  const end = endOfWeek(anchor, WEEK);
  const isCurrent = isSameWeek(anchor, now, WEEK);
  const lastWeek = isSameWeek(anchor, subWeeks(now, 1), WEEK);
  return {
    granularity,
    anchor: format(anchor, KEY),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label: isCurrent ? "This week" : lastWeek ? "Last week" : `Week of ${format(start, "d MMM")}`,
    rangeLabel: start.getMonth() === end.getMonth() ? `${format(start, "d")}–${format(end, "d MMM")}` : `${format(start, "d MMM")}–${format(end, "d MMM")}`,
    isCurrent,
    prevAnchor: format(subWeeks(anchor, 1), KEY),
    nextAnchor: isCurrent ? null : format(addWeeks(anchor, 1), KEY),
  };
}

export function inPeriod(iso: string | null | undefined, p: Period): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= new Date(p.startIso).getTime() && t <= new Date(p.endIso).getTime();
}

export function periodTitle(p: Period): string {
  return p.rangeLabel ? `${p.label} · ${p.rangeLabel}` : p.label;
}
