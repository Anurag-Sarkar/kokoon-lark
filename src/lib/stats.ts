import { addWeeks, differenceInCalendarDays, format, startOfWeek, subDays, subWeeks } from "date-fns";
import type { TaskDTO, UserDTO } from "./types";

export type TaskHealth = "done_on_time" | "done_late" | "overdue" | "due_soon" | "on_track";

export const DUE_SOON_HOURS = 48;

export function taskHealth(t: TaskDTO, now = new Date()): TaskHealth {
  const dl = new Date(t.deadline).getTime();
  if (t.status === "done") {
    const c = t.completedAt ? new Date(t.completedAt).getTime() : now.getTime();
    return c <= dl ? "done_on_time" : "done_late";
  }
  if (now.getTime() > dl) return "overdue";
  if (dl - now.getTime() <= DUE_SOON_HOURS * 3_600_000) return "due_soon";
  return "on_track";
}

export const HEALTH_LABEL: Record<TaskHealth, string> = {
  done_on_time: "Done on time",
  done_late: "Done late",
  overdue: "Overdue",
  due_soon: "Due soon",
  on_track: "On track",
};

export type Level = "crushing" | "on_track" | "slipping" | "lagging" | "idle" | "no_tasks";

export const LEVEL_META: Record<Level, { label: string; tone: "good" | "accent" | "warn" | "critical" | "muted" }> = {
  crushing: { label: "Crushing it", tone: "good" },
  on_track: { label: "On track", tone: "accent" },
  slipping: { label: "Slipping", tone: "warn" },
  lagging: { label: "Lagging", tone: "critical" },
  idle: { label: "Idle", tone: "muted" },
  no_tasks: { label: "No tasks yet", tone: "muted" },
};

/** Score thresholds: crushing ≥ 90, on track ≥ 75, slipping ≥ 50, lagging below. */
export function levelForScore(score: number): Level {
  return score >= 90 ? "crushing" : score >= 75 ? "on_track" : score >= 50 ? "slipping" : "lagging";
}

export interface WeekBucket {
  weekStart: string;
  label: string;
  onTime: number;
  late: number;
}

export interface UserStats {
  userId: string;
  total: number;
  ongoing: number;
  overdue: number;
  dueSoon: number;
  onTrack: number;
  doneOnTime: number;
  doneLate: number;
  doneOnTime30: number;
  doneLate30: number;
  onTimeRate: number | null;
  onTimeRate30: number | null;
  avgLateHours: number | null;
  completedThisWeek: number;
  completedLastWeek: number;
  deadlineMoves30: number;
  deadlineMovesTotal: number;
  lastActivityAt: string | null;
  daysSinceActivity: number | null;
  streakWeeks: number;
  score: number | null;
  level: Level;
  verdict: string;
  weekly: WeekBucket[];
}

const WEEK_OPTS = { weekStartsOn: 1 as const };

export function weekBuckets(tasks: TaskDTO[], weeks: number, now = new Date(), onlyUser?: string): WeekBucket[] {
  const thisWeek = startOfWeek(now, WEEK_OPTS);
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = subWeeks(thisWeek, i);
    buckets.push({ weekStart: ws.toISOString(), label: format(ws, "MMM d"), onTime: 0, late: 0 });
  }
  const first = new Date(buckets[0]!.weekStart).getTime();
  for (const t of tasks) {
    if (t.status !== "done" || !t.completedAt) continue;
    if (onlyUser && !t.assignees.includes(onlyUser)) continue;
    const c = new Date(t.completedAt);
    if (c.getTime() < first) continue;
    const ws = startOfWeek(c, WEEK_OPTS).getTime();
    const b = buckets.find((x) => new Date(x.weekStart).getTime() === ws);
    if (!b) continue;
    if (taskHealth(t, now) === "done_late") b.late++;
    else b.onTime++;
  }
  return buckets;
}

function lastActivityFor(userId: string, tasks: TaskDTO[]): Date | null {
  let last: number | null = null;
  const bump = (iso: string | null) => {
    if (!iso) return;
    const t = new Date(iso).getTime();
    if (last === null || t > last) last = t;
  };
  for (const t of tasks) {
    for (const a of t.activity) if (a.userId === userId) bump(a.createdAt);
    for (const c of t.comments) if (c.userId === userId) bump(c.createdAt);
    for (const s of t.subtasks) if (s.completedBy === userId) bump(s.completedAt);
    if (t.completedBy === userId) bump(t.completedAt);
  }
  return last === null ? null : new Date(last);
}

function streak(weekly: WeekBucket[]): number {
  // Count consecutive weeks (ending at the latest week with any completion) that have >=1 on-time completion.
  let i = weekly.length - 1;
  if (i >= 0 && weekly[i]!.onTime === 0 && weekly[i]!.late === 0) i--; // current week may still be in progress
  let n = 0;
  for (; i >= 0; i--) {
    if (weekly[i]!.onTime > 0) n++;
    else break;
  }
  return n;
}

export function computeUserStats(userId: string, allTasks: TaskDTO[], now = new Date()): UserStats {
  const mine = allTasks.filter((t) => t.assignees.includes(userId));
  const cutoff30 = subDays(now, 30).getTime();
  const thisWeekStart = startOfWeek(now, WEEK_OPTS).getTime();
  const lastWeekStart = subWeeks(thisWeekStart, 1).getTime();

  let ongoing = 0, overdue = 0, dueSoon = 0, onTrack = 0;
  let doneOnTime = 0, doneLate = 0, doneOnTime30 = 0, doneLate30 = 0;
  let completedThisWeek = 0, completedLastWeek = 0;
  let lateHoursSum = 0;

  for (const t of mine) {
    const h = taskHealth(t, now);
    if (h === "done_on_time" || h === "done_late") {
      const c = new Date(t.completedAt ?? now).getTime();
      const recent = c >= cutoff30;
      if (h === "done_on_time") { doneOnTime++; if (recent) doneOnTime30++; }
      else {
        doneLate++; if (recent) doneLate30++;
        lateHoursSum += (c - new Date(t.deadline).getTime()) / 3_600_000;
      }
      if (c >= thisWeekStart) completedThisWeek++;
      else if (c >= lastWeekStart) completedLastWeek++;
    } else {
      ongoing++;
      if (h === "overdue") overdue++;
      else if (h === "due_soon") dueSoon++;
      else onTrack++;
    }
  }

  const completions = doneOnTime + doneLate;
  const completions30 = doneOnTime30 + doneLate30;
  const onTimeRate = completions > 0 ? doneOnTime / completions : null;
  const onTimeRate30 = completions30 > 0 ? doneOnTime30 / completions30 : null;
  const avgLateHours = doneLate > 0 ? lateHoursSum / doneLate : null;

  let deadlineMoves30 = 0, deadlineMovesTotal = 0;
  for (const t of allTasks) {
    for (const d of t.deadlineChanges) {
      if (d.changedBy !== userId) continue;
      deadlineMovesTotal++;
      if (new Date(d.createdAt).getTime() >= cutoff30) deadlineMoves30++;
    }
  }

  const last = lastActivityFor(userId, allTasks);
  const daysSinceActivity = last ? differenceInCalendarDays(now, last) : null;
  const weekly = weekBuckets(mine, 8, now);
  const streakWeeks = streak(weekly);

  let score: number | null = null;
  let level: Level;
  if (mine.length === 0) {
    level = "no_tasks";
  } else {
    const reliability = Math.pow(onTimeRate30 ?? onTimeRate ?? 0.8, 1.5);
    const overdueFactor = Math.max(0, 1 - 0.4 * overdue);
    const activityFactor =
      daysSinceActivity !== null && daysSinceActivity <= 7 ? 1
        : daysSinceActivity !== null && daysSinceActivity <= 14 ? (ongoing > 0 ? 0.3 : 0.8)
        : ongoing > 0 ? 0 : 0.8;
    score = Math.round(100 * (0.4 * reliability + 0.45 * overdueFactor + 0.15 * activityFactor));
    score = Math.max(0, Math.min(100, score));
    level = levelForScore(score);
    const idle = ongoing > 0 && (daysSinceActivity === null || daysSinceActivity >= 7);
    if (idle && level !== "lagging") {
      level = "idle";
      score = Math.min(score, 60); // not showing up is not ownership, whatever the history says
    }
  }

  const verdict = buildVerdict({ level, ongoing, overdue, dueSoon, doneOnTime30, doneLate30, daysSinceActivity, streakWeeks });

  return {
    userId, total: mine.length, ongoing, overdue, dueSoon, onTrack,
    doneOnTime, doneLate, doneOnTime30, doneLate30, onTimeRate, onTimeRate30, avgLateHours,
    completedThisWeek, completedLastWeek, deadlineMoves30, deadlineMovesTotal,
    lastActivityAt: last ? last.toISOString() : null, daysSinceActivity,
    streakWeeks, score, level, verdict, weekly,
  };
}

function n(count: number, word: string): string {
  return `${count} ${count === 1 ? word : word + "s"}`;
}

function buildVerdict(s: {
  level: Level; ongoing: number; overdue: number; dueSoon: number;
  doneOnTime30: number; doneLate30: number; daysSinceActivity: number | null; streakWeeks: number;
}): string {
  switch (s.level) {
    case "no_tasks":
      return "Nothing assigned to you yet. When a task lands here, you'll see exactly where you stand.";
    case "crushing":
      return `${n(s.doneOnTime30, "task")} done on time this month and nothing overdue.${s.streakWeeks >= 2 ? ` ${s.streakWeeks}-week on-time streak.` : ""} Keep owning it.`;
    case "on_track":
      return `${n(s.ongoing, "task")} open, ${s.overdue === 0 ? "nothing overdue" : n(s.overdue, "overdue")}${s.dueSoon > 0 ? `, ${s.dueSoon} due in the next 48h` : ""}. Steady.`;
    case "slipping":
      if (s.overdue === 0) return `Nothing overdue, but ${n(s.doneLate30, "task")} finished late this month. Time to tighten up.`;
      return `${n(s.overdue, "task")} overdue${s.doneLate30 > 0 ? ` and ${s.doneLate30} finished late this month` : ""}. Time to tighten up.`;
    case "lagging":
      if (s.overdue === 0) return `${n(s.doneLate30, "task")} finished late this month${s.daysSinceActivity !== null && s.daysSinceActivity >= 7 ? ` and no activity for ${n(s.daysSinceActivity, "day")}` : ""}. You're behind and your team can see it.`;
      return `${n(s.overdue, "task")} overdue${s.doneLate30 > 0 ? `, ${s.doneLate30} finished late this month` : ""}. You're behind and your team can see it.`;
    case "idle":
      return `No activity ${s.daysSinceActivity === null ? "yet" : `for ${n(s.daysSinceActivity, "day")}`} with ${n(s.ongoing, "open task")}. Pick one up today.`;
  }
}

/* ---------- Team-level ---------- */

export interface TeamStats {
  activeTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  completedThisWeek: number;
  completedLastWeek: number;
  doneOnTime30: number;
  doneLate30: number;
  onTimeRate30: number | null;
  deadlineMoves30: number;
  weekly: WeekBucket[];
  workload: { userId: string; onTrack: number; dueSoon: number; overdue: number }[];
  people: UserStats[];
}

export function computeTeamStats(users: UserDTO[], tasks: TaskDTO[], now = new Date()): TeamStats {
  const cutoff30 = subDays(now, 30).getTime();
  const thisWeekStart = startOfWeek(now, WEEK_OPTS).getTime();
  const lastWeekStart = subWeeks(thisWeekStart, 1).getTime();
  let activeTasks = 0, overdueTasks = 0, dueSoonTasks = 0, completedThisWeek = 0, completedLastWeek = 0, doneOnTime30 = 0, doneLate30 = 0, deadlineMoves30 = 0;
  for (const t of tasks) {
    const h = taskHealth(t, now);
    if (h === "done_on_time" || h === "done_late") {
      const c = new Date(t.completedAt ?? now).getTime();
      if (c >= cutoff30) { if (h === "done_on_time") doneOnTime30++; else doneLate30++; }
      if (c >= thisWeekStart) completedThisWeek++;
      else if (c >= lastWeekStart) completedLastWeek++;
    } else {
      activeTasks++;
      if (h === "overdue") overdueTasks++;
      if (h === "due_soon") dueSoonTasks++;
    }
    for (const d of t.deadlineChanges) if (new Date(d.createdAt).getTime() >= cutoff30) deadlineMoves30++;
  }
  const people = users.map((u) => computeUserStats(u.id, tasks, now));
  const workload = people.map((p) => ({ userId: p.userId, onTrack: p.onTrack, dueSoon: p.dueSoon, overdue: p.overdue }));
  const c30 = doneOnTime30 + doneLate30;
  return {
    activeTasks, overdueTasks, dueSoonTasks, completedThisWeek, completedLastWeek,
    doneOnTime30, doneLate30, onTimeRate30: c30 > 0 ? doneOnTime30 / c30 : null,
    deadlineMoves30, weekly: weekBuckets(tasks, 12, now), workload, people,
  };
}

/** Upcoming week ticks for timelines (unused helper kept small). */
export function nextWeeks(count: number, now = new Date()): string[] {
  const start = startOfWeek(now, WEEK_OPTS);
  return Array.from({ length: count }, (_, i) => format(addWeeks(start, i), "MMM d"));
}
