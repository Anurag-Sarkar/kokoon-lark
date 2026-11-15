import {
  differenceInCalendarDays,
  differenceInHours,
  differenceInMinutes,
  format,
  isSameYear,
  isToday,
  isTomorrow,
  isYesterday,
} from "date-fns";

export function fmtDate(iso: string, now = new Date()): string {
  const d = new Date(iso);
  return isSameYear(d, now) ? format(d, "MMM d") : format(d, "MMM d, yyyy");
}

export function fmtDateTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const day = isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : isYesterday(d) ? "Yesterday" : fmtDate(iso, now);
  return `${day}, ${format(d, "h:mm a")}`;
}

export function fmtShortDateTime(iso: string): string {
  return format(new Date(iso), "MMM d, h:mm a");
}

export function toDatetimeLocal(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
}

export function timeAgo(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const mins = differenceInMinutes(now, d);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = differenceInHours(now, d);
  if (hours < 24) return `${hours}h ago`;
  const days = differenceInCalendarDays(now, d);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso, now);
}

/** Human description of time between now and a deadline. */
export function deadlineDistance(deadlineIso: string, now = new Date()): { label: string; tone: "overdue" | "soon" | "ok" } {
  const d = new Date(deadlineIso);
  const ms = d.getTime() - now.getTime();
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3_600_000);
  const dd = Math.floor(abs / 86_400_000);
  const chunk = dd >= 1 ? `${dd}d` : h >= 1 ? `${h}h` : `${Math.max(1, Math.floor(abs / 60_000))}m`;
  if (ms < 0) return { label: `Overdue by ${chunk}`, tone: "overdue" };
  if (ms <= 48 * 3_600_000) return { label: `Due in ${chunk}`, tone: "soon" };
  return { label: `Due in ${chunk}`, tone: "ok" };
}

/** How late a completed task was. */
export function latenessLabel(deadlineIso: string, completedIso: string): string {
  const ms = new Date(completedIso).getTime() - new Date(deadlineIso).getTime();
  if (ms <= 0) return "on time";
  const h = Math.floor(ms / 3_600_000);
  const d = Math.floor(ms / 86_400_000);
  if (d >= 1) return `${d}d late`;
  if (h >= 1) return `${h}h late`;
  return `${Math.max(1, Math.floor(ms / 60_000))}m late`;
}

export function shiftLabel(oldIso: string, newIso: string): string {
  const ms = new Date(newIso).getTime() - new Date(oldIso).getTime();
  const days = Math.round(Math.abs(ms) / 86_400_000);
  const hours = Math.round(Math.abs(ms) / 3_600_000);
  const chunk = days >= 1 ? `${days} day${days === 1 ? "" : "s"}` : `${hours} hour${hours === 1 ? "" : "s"}`;
  return ms >= 0 ? `pushed ${chunk} later` : `pulled ${chunk} earlier`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function pct(n: number | null, digits = 0): string {
  if (n === null || Number.isNaN(n)) return "–";
  return `${(n * 100).toFixed(digits)}%`;
}

export function plural(n: number, word: string, pluralWord?: string): string {
  return `${n} ${n === 1 ? word : pluralWord ?? `${word}s`}`;
}
