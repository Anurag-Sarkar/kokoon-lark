/* Web Push (PWA notifications). Keys come from VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY; without them push is simply off. */

import * as webpush from "web-push";
import { Types } from "mongoose";
import { connectDB } from "./mongodb";
import { PushSubscription } from "./models";

export function pushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function pushPublicKey(): string | null {
  return pushConfigured() ? process.env.VAPID_PUBLIC_KEY! : null;
}

/** Push services want a contact: VAPID_SUBJECT, else the https APP_URL, else a placeholder mailto. */
function subject(): string {
  const s = process.env.VAPID_SUBJECT?.trim();
  if (s) return s;
  const app = process.env.APP_URL?.trim();
  if (app && app.startsWith("https://")) return app;
  return "mailto:admin@localhost";
}

let ready = false;
function setup(): boolean {
  if (!pushConfigured()) return false;
  if (!ready) {
    webpush.setVapidDetails(subject(), process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
    ready = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Path or URL opened when the notification is tapped */
  url: string;
  /** Same tag replaces an earlier notification instead of stacking */
  tag?: string;
}

/** Sends a notification to every device these people turned push on for. Dead subscriptions are removed. Never throws. */
export async function sendPush(userIds: string[], payload: PushPayload): Promise<{ sent: number; failed: number }> {
  const result = { sent: 0, failed: 0 };
  if (userIds.length === 0 || !setup()) return result;
  try {
    await connectDB();
    const subs = await PushSubscription.find({ userId: { $in: userIds.map((id) => new Types.ObjectId(id)) } }).lean();
    if (subs.length === 0) return result;
    const body = JSON.stringify(payload);
    const gone: Types.ObjectId[] = [];
    const used: Types.ObjectId[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body, { TTL: 24 * 3600 });
          result.sent++;
          used.push(s._id);
        } catch (err) {
          result.failed++;
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) gone.push(s._id); // unsubscribed or expired on the push service
          else console.error("[push] send failed:", status ?? err);
        }
      })
    );
    if (gone.length) await PushSubscription.deleteMany({ _id: { $in: gone } });
    if (used.length) await PushSubscription.updateMany({ _id: { $in: used } }, { $set: { lastUsedAt: new Date() } });
  } catch (err) {
    console.error("[push] failed:", err);
  }
  return result;
}
