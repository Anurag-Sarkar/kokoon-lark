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

export async function requireUser(): Promise<UserDTO> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
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

export async function destroySession(token: string): Promise<void> {
  await connectDB();
  await Session.deleteOne({ token });
}
