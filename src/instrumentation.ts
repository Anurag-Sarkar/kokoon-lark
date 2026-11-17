/* Runs once when the Next.js server starts (not during `next build`). */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { applyAppTimeZone } = await import("./lib/timezone");
  applyAppTimeZone();

  // Reminders run in production unless REMINDERS=off; in `next dev` only with REMINDERS=on.
  const flag = process.env.REMINDERS?.trim().toLowerCase();
  const on = flag === "off" ? false : flag === "on" || process.env.NODE_ENV === "production";
  if (!on) return;
  const { startReminderScheduler } = await import("./lib/reminders");
  startReminderScheduler();
}
