import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

/**
 * Runs one reminder sweep and reports what went out. Open to signed-in admins, and to an outside
 * scheduler (cron, a cloud scheduler) that sends `Authorization: Bearer <CRON_SECRET>`.
 */
export async function POST(req: Request): Promise<Response> {
  if (!(await allowed(req))) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  return NextResponse.json(await runReminders());
}

export const GET = POST;

async function allowed(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return true;
  const user = await getCurrentUser();
  return user?.role === "admin";
}
