/* The timezone the team works in. Server-rendered dates, the "Due today" grouping and reminder times all use it. */

function valid(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** APP_TIMEZONE when it is a real IANA zone, else whatever the process runs in. */
export function appTimeZone(): string {
  const want = process.env.APP_TIMEZONE?.trim();
  if (want && valid(want)) return want;
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/**
 * Makes this Node process render dates in APP_TIMEZONE. Node re-reads TZ when it changes at runtime,
 * so a cloud box that boots in UTC still shows the team's local times. Called once at server start.
 */
export function applyAppTimeZone(): string {
  const want = process.env.APP_TIMEZONE?.trim();
  if (want && !valid(want)) console.warn(`[timezone] APP_TIMEZONE "${want}" is not an IANA zone name; staying on ${appTimeZone()}`);
  else if (want && process.env.TZ !== want) process.env.TZ = want;
  return appTimeZone();
}

export interface WallClock {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** What the clock on the wall says at this instant in the given zone. */
export function wallClock(date: Date, tz: string): WallClock {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(date)) if (part.type !== "literal") p[part.type] = Number(part.value);
  return { year: p.year!, month: p.month!, day: p.day!, hour: (p.hour ?? 0) % 24, minute: p.minute ?? 0, second: p.second ?? 0 };
}

function offsetMs(date: Date, tz: string): number {
  const w = wallClock(date, tz);
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - Math.floor(date.getTime() / 1000) * 1000;
}

/** The instant when the wall clock in `tz` shows this time. Day may overflow (day 32 rolls into next month). */
export function atWallClock(w: { year: number; month: number; day: number; hour?: number; minute?: number }, tz: string): Date {
  const wall = Date.UTC(w.year, w.month - 1, w.day, w.hour ?? 0, w.minute ?? 0, 0, 0);
  let guess = new Date(wall - offsetMs(new Date(wall), tz));
  const again = wall - offsetMs(guess, tz);
  if (again !== guess.getTime()) guess = new Date(again); // second pass for DST edges
  return guess;
}
