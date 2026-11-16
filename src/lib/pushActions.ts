"use server";

import { Types } from "mongoose";
import { getCurrentUser } from "./auth";
import { connectDB } from "./mongodb";
import { PushSubscription } from "./models";
import { pushConfigured, pushPublicKey, sendPush } from "./push";
import type { ActionResult } from "./types";

export async function getPushPublicKey(): Promise<string | null> {
  return pushPublicKey();
}

/** Stores (or re-attaches) this browser's push subscription to the signed-in person. */
export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent = ""): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in first." };
  if (!pushConfigured()) return { ok: false, error: "Push notifications aren't set up on this server yet. Ask your admin to add the VAPID keys." };
  if (!/^https:\/\//.test(sub?.endpoint ?? "") || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false, error: "That subscription looks invalid." };
  await connectDB();
  await PushSubscription.updateOne(
    { endpoint: sub.endpoint },
    { $set: { userId: new Types.ObjectId(user.id), keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, userAgent: userAgent.slice(0, 300) } },
    { upsert: true }
  );
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in first." };
  await connectDB();
  await PushSubscription.deleteOne({ endpoint, userId: new Types.ObjectId(user.id) });
  return { ok: true };
}

/** Sends a sample notification to every device the signed-in person has turned push on for. */
export async function sendTestPush(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in first." };
  if (!pushConfigured()) return { ok: false, error: "Push notifications aren't set up on this server yet." };
  const r = await sendPush([user.id], {
    title: "Kokoon Task notifications are on",
    body: `Hi ${user.name.split(" ")[0]}, this is what a notification looks like.`,
    url: "/account",
    tag: "test",
  });
  if (r.sent === 0) return { ok: false, error: r.failed > 0 ? "The push service rejected it. Turn notifications off and on again on this device." : "No device is subscribed for you yet." };
  return { ok: true };
}
