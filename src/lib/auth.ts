import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { randomBytes } from "node:crypto";
import { connectDB } from "./mongodb";
import { Session, User } from "./models";
import { toUserDTO } from "./serialize";
import type { UserDTO } from "./types";

export const SESSION_COOKIE = "kt_session";
const SESSION_DAYS = 30;

export const getCurrentUser = cache(async (): Promise<UserDTO | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    await connectDB();
    const session = await Session.findOne({ token }).lean();
    if (!session || session.expiresAt.getTime() < Date.now()) return null;
    const user = await User.findById(session.userId).lean();
    if (!user || user.active === false) return null;
    return toUserDTO(user);
  } catch {
    return null;
  }
});

/** Signed-in user, or a redirect to /login. Someone on a temporary password is sent to /account until they change it. */
export async function requireUser(opts: { allowPasswordChange?: boolean } = {}): Promise<UserDTO> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !opts.allowPasswordChange) redirect("/account?change=required");
  return user;
}

export async function requireAdmin(): Promise<UserDTO> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  await connectDB();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await Session.create({ token, userId, expiresAt });
  return { token, expiresAt };
}

/** Creates a session and sets the cookie. Call from a server action, then redirect. */
export async function startSession(userId: string): Promise<void> {
  const { token, expiresAt } = await createSession(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession(token: string): Promise<void> {
  await connectDB();
  await Session.deleteOne({ token });
}

/** Signs a person out everywhere, e.g. after a password reset. */
export async function destroyAllSessions(userId: string): Promise<void> {
  await connectDB();
  await Session.deleteMany({ userId });
}
