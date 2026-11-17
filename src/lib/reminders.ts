/*
 * Deadline reminders: a push and an email to a task's owners two days before it is due, and again on the
 * morning it is due. Runs inside the app every few minutes (see src/instrumentation.ts) or on demand via
 * POST /api/reminders/run. Each reminder is recorded on the task, so it goes out once per deadline.
 */

import { connectDB } from "./mongodb";
import { Task, User, type ReminderKind, type TaskDoc } from "./models";
import { sendPush } from "./push";
import { appUrl, sendMail } from "./mail";
import { reminderEmail } from "./emails";
import { fmtDateTime } from "./format";
import { appTimeZone, atWallClock, wallClock } from "./timezone";

export type { ReminderKind };

const HOUR = 3_600_000;
const KINDS: ReminderKind[] = ["48h", "today"];
/** A reminder still goes out this long after its moment (the server was restarting, say), never later. */
const GRACE_MS = 12 * HOUR;
/** Nothing is pushed between these local hours; a two-day reminder that would land at night waits for the morning. */
const QUIET_FROM = 22;
const QUIET_UNTIL = 8;

/** Local hour at which the "due today" reminder goes out. REMINDER_HOUR, default 9. */
export function reminderHour(): number {
  const n = Number(process.env.REMINDER_HOUR ?? 9);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : 9;
}

/** The instant a reminder of this kind should go out for a deadline. */
export function reminderMoment(kind: ReminderKind, deadline: Date, tz = appTimeZone(), hour = reminderHour()): Date {
  if (kind === "today") {
    const d = wallClock(deadline, tz);
    return atWallClock({ year: d.year, month: d.month, day: d.day, hour }, tz);
  }
  const at = new Date(deadline.getTime() - 48 * HOUR);
  const w = wallClock(at, tz);
  if (w.hour >= QUIET_FROM) return atWallClock({ year: w.year, month: w.month, day: w.day + 1, hour: QUIET_UNTIL }, tz);
  if (w.hour < QUIET_UNTIL) return atWallClock({ year: w.year, month: w.month, day: w.day, hour: QUIET_UNTIL }, tz);
  return at;
}

type Candidate = Pick<TaskDoc, "_id" | "title" | "deadline" | "assignees" | "createdAt" | "deadlineChanges" | "reminders">;

/** When the current deadline was set: creation, or the latest applied change. A reminder due before that is skipped, since the assignment itself was the heads-up. */
function deadlineSetAt(t: Candidate): number {
  let at = new Date(t.createdAt).getTime();
  for (const c of t.deadlineChanges ?? []) at = Math.max(at, new Date(c.createdAt).getTime());
  return at;
}

export interface ReminderRun {
  at: string;
  localNow: string;
  timeZone: string;
  checked: number;
  sent: { task: string; kind: ReminderKind; people: number; pushed: number }[];
}

/** One sweep: finds tasks whose reminder moment has arrived and sends it. Safe to call as often as you like. */
export async function runReminders(now = new Date()): Promise<ReminderRun> {
  const tz = appTimeZone();
  const run: ReminderRun = { at: now.toISOString(), localNow: fmtDateTime(now.toISOString(), now), timeZone: tz, checked: 0, sent: [] };
  await connectDB();
  const tasks: Candidate[] = await Task.find({
    status: { $ne: "done" },
    deadline: { $gte: new Date(now.getTime() - 36 * HOUR), $lte: new Date(now.getTime() + 49 * HOUR) },
    "assignees.0": { $exists: true },
  })
    .select("title deadline assignees createdAt deadlineChanges reminders")
    .lean();
  run.checked = tasks.length;

  for (const task of tasks) {
    const deadline = new Date(task.deadline);
    const setAt = deadlineSetAt(task);
    for (const kind of KINDS) {
      const at = reminderMoment(kind, deadline, tz);
      if (at.getTime() > now.getTime()) continue; // not yet
      if (now.getTime() - at.getTime() > GRACE_MS) continue; // missed by too much to be useful
      if (setAt >= at.getTime()) continue; // deadline was set after this moment
      if ((task.reminders ?? []).some((r) => r.kind === kind && new Date(r.deadline).getTime() === deadline.getTime())) continue;

      // Claim it first, atomically, so two sweeps (or two servers) never send the same reminder twice.
      const claim = await Task.updateOne(
        { _id: task._id, status: { $ne: "done" }, deadline, reminders: { $not: { $elemMatch: { kind, deadline } } } },
        { $push: { reminders: { kind, deadline, sentAt: now, to: task.assignees } } }
      );
      if (claim.modifiedCount !== 1) continue;

      const result = await deliver(task, kind, deadline, now);
      run.sent.push({ task: task.title, kind, people: result.people, pushed: result.pushed });
    }
  }
  return run;
}

async function deliver(task: Candidate, kind: ReminderKind, deadline: Date, now: Date): Promise<{ people: number; pushed: number }> {
  const ids = task.assignees.map((a) => a.toString());
  const path = `/tasks/${task._id.toString()}`;
  const when = fmtDateTime(deadline.toISOString(), now); // "Today, 5:00 PM" / "Nov 19, 5:00 PM"
  const past = deadline.getTime() < now.getTime();
  const push = await sendPush(ids, {
    title: kind === "48h" ? "Due in 2 days" : "Due today",
    body: past ? `${task.title} · was due ${when} and is still open` : `${task.title} · due ${when}`,
    url: path,
    tag: `due-${task._id.toString()}`,
  });

  let people = 0;
  try {
    const users = await User.find({ _id: { $in: task.assignees }, active: { $ne: false } }).select("name email emailNotifications").lean();
    people = users.length;
    const mailable = users.filter((u) => u.emailNotifications !== false);
    if (mailable.length > 0) {
      const link = `${await appUrl()}${path}`;
      await Promise.allSettled(
        mailable.map((u) => sendMail({ to: u.email, ...reminderEmail({ name: u.name, taskTitle: task.title, kind, past, whenLabel: when, link }) }))
      );
    }
  } catch (err) {
    console.error("[reminders] emails failed:", err);
  }
  return { people, pushed: push.sent };
}

declare global {
  // eslint-disable-next-line no-var
  var __kokoonReminders: ReturnType<typeof setInterval> | undefined;
}

/** Starts the in-process sweep. Idempotent, so hot reloads and repeated calls don't stack timers. */
export function startReminderScheduler(everyMinutes = 10): void {
  if (globalThis.__kokoonReminders) return;
  const tick = async () => {
    try {
      const r = await runReminders();
      if (r.sent.length > 0) {
        const lines = r.sent.map((s) => `${s.kind} "${s.task}" → ${s.people} ${s.people === 1 ? "person" : "people"}, ${s.pushed} push`);
        console.log(`[reminders] ${r.localNow}: sent ${r.sent.length} (${lines.join("; ")})`);
      }
    } catch (err) {
      console.error("[reminders] sweep failed:", err);
    }
  };
  const timer = setInterval(tick, everyMinutes * 60_000);
  timer.unref?.();
  globalThis.__kokoonReminders = timer;
  setTimeout(tick, 20_000).unref?.();
  console.log(`[reminders] on · every ${everyMinutes} min · ${appTimeZone()} · "due today" at ${String(reminderHour()).padStart(2, "0")}:00 · "due in 2 days" 48 h ahead (never between ${QUIET_FROM}:00 and ${String(QUIET_UNTIL).padStart(2, "0")}:00)`);
}
