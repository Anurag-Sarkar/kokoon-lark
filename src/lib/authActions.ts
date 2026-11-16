"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { destroyAllSessions, getCurrentUser, requireUser, startSession } from "./auth";
import { connectDB } from "./mongodb";
import { User } from "./models";
import { consumeToken, INVITE_TTL_MS, issueToken, RESET_TTL_MS } from "./tokens";
import { appUrl, sendMail } from "./mail";
import { inviteEmail, resetLinkEmail } from "./emails";
import { isValidId } from "./queries";
import type { ActionResult } from "./types";

export type AuthFormState = { error?: string; done?: boolean } | undefined;

const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function checkNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password !== confirm) return "The two passwords don't match.";
  return null;
}

/* ---------------- first account ---------------- */

/** Creates the first admin of an empty workspace. Once anyone exists, accounts come from invites. */
export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (await getCurrentUser()) redirect("/dashboard");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (name.length < 2) return { error: "Enter your name." };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email." };
  const bad = checkNewPassword(password, confirm);
  if (bad) return { error: bad };

  await connectDB();
  if ((await User.countDocuments()) > 0) return { error: "This workspace already has accounts. Ask an admin to invite you." };
  const user = await User.create({ name, email, role: "admin", title: "Admin", color: "#0b0b0b", passwordHash: await bcrypt.hash(password, 10) });
  await startSession(user._id.toString());
  redirect("/dashboard");
}

/* ---------------- forgot / reset ---------------- */

/** Always reports success so the form can't be used to discover which emails exist. */
export async function requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Enter your email." };
  await connectDB();
  const user = await User.findOne({ email, active: { $ne: false } }).lean();
  if (user) {
    const raw = await issueToken(user._id.toString(), "reset", RESET_TTL_MS);
    const link = `${await appUrl()}/reset-password/${raw}`;
    await sendMail({ to: user.email, ...resetLinkEmail({ name: user.name, link, minutes: 60 }) });
  }
  return { done: true };
}

export async function resetPasswordWithToken(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const bad = checkNewPassword(password, confirm);
  if (bad) return { error: bad };
  const t = await consumeToken(token, "reset");
  if (!t) return { error: "This link has expired or was already used. Request a new one." };
  await User.updateOne({ _id: t.userId }, { $set: { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: false } });
  await destroyAllSessions(t.userId);
  await startSession(t.userId);
  redirect("/dashboard");
}

/* ---------------- invites ---------------- */

export async function acceptInvite(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const bad = checkNewPassword(password, confirm);
  if (bad) return { error: bad };
  const t = await consumeToken(token, "invite");
  if (!t) return { error: "This invite has expired or was already used. Ask your admin to send a new one." };
  const user = await User.findById(t.userId).lean();
  if (!user || user.active === false) return { error: "This account is no longer active." };
  await User.updateOne({ _id: t.userId }, { $set: { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: false } });
  await startSession(t.userId);
  redirect("/dashboard");
}

export type InviteResult = { ok: true; link: string; delivered: boolean } | { ok: false; error: string };

/** Admin: new invite link for someone who hasn't set a password yet. */
export async function resendInvite(userId: string): Promise<InviteResult> {
  const actor = await requireUser();
  if (actor.role !== "admin") return { ok: false, error: "Admins only." };
  if (!isValidId(userId)) return { ok: false, error: "User not found." };
  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user || user.active === false) return { ok: false, error: "User not found." };
  if (user.passwordHash) return { ok: false, error: `${user.name} has already set a password. Use Reset password instead.` };
  const raw = await issueToken(userId, "invite", INVITE_TTL_MS);
  const link = `${await appUrl()}/invite/${raw}`;
  const r = await sendMail({ to: user.email, ...inviteEmail({ name: user.name, inviterName: actor.name, link, days: 7 }) });
  if (!r.ok) return { ok: false, error: `Email failed: ${r.error}` };
  return { ok: true, link, delivered: r.delivered };
}

/* ---------------- own account ---------------- */

export async function changePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const user = await requireUser({ allowPasswordChange: true });
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const bad = checkNewPassword(password, confirm);
  if (bad) return { error: bad };

  await connectDB();
  const doc = await User.findById(user.id).lean();
  if (!doc) return { error: "Account not found." };
  const forced = user.mustChangePassword;
  if (!forced && doc.passwordHash) {
    if (!current) return { error: "Enter your current password." };
    if (!(await bcrypt.compare(current, doc.passwordHash))) return { error: "Your current password is wrong." };
  }
  if (doc.passwordHash && (await bcrypt.compare(password, doc.passwordHash))) return { error: "Choose a password you haven't used here before." };

  await User.updateOne({ _id: user.id }, { $set: { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: false } });
  revalidatePath("/", "layout");
  if (forced) redirect("/dashboard");
  return { done: true };
}

export async function setEmailNotifications(enabled: boolean): Promise<ActionResult> {
  const user = await requireUser({ allowPasswordChange: true });
  await connectDB();
  await User.updateOne({ _id: user.id }, { $set: { emailNotifications: !!enabled } });
  revalidatePath("/", "layout");
  return { ok: true };
}
