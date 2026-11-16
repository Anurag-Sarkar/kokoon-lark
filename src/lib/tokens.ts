import { createHash, randomBytes } from "node:crypto";
import { connectDB } from "./mongodb";
import { AuthToken } from "./models";

export type TokenPurpose = "invite" | "reset";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RESET_TTL_MS = 60 * 60 * 1000;

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

/** Creates a single-use token for a person, replacing any unused token of the same purpose. Returns the raw secret for the link. */
export async function issueToken(userId: string, purpose: TokenPurpose, ttlMs: number): Promise<string> {
  await connectDB();
  const raw = randomBytes(32).toString("base64url");
  await AuthToken.deleteMany({ userId, purpose, usedAt: null });
  await AuthToken.create({ tokenHash: hash(raw), userId, purpose, expiresAt: new Date(Date.now() + ttlMs), usedAt: null });
  return raw;
}

/** Looks a token up without using it, for rendering the page it protects. */
export async function peekToken(raw: string, purpose: TokenPurpose): Promise<{ userId: string } | null> {
  if (!raw || raw.length > 128) return null;
  await connectDB();
  const t = await AuthToken.findOne({ tokenHash: hash(raw), purpose, usedAt: null, expiresAt: { $gt: new Date() } }).lean();
  return t ? { userId: t.userId.toString() } : null;
}

/** Atomically marks a token used. Returns null if it was invalid, expired or already used. */
export async function consumeToken(raw: string, purpose: TokenPurpose): Promise<{ userId: string } | null> {
  if (!raw || raw.length > 128) return null;
  await connectDB();
  const t = await AuthToken.findOneAndUpdate(
    { tokenHash: hash(raw), purpose, usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { new: true }
  ).lean();
  return t ? { userId: t.userId.toString() } : null;
}
