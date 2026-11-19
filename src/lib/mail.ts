import nodemailer, { type Transporter } from "nodemailer";
import { headers } from "next/headers";

/**
 * Outbound email. Picks a provider from the environment:
 *   RESEND_API_KEY            → Resend (https://resend.com)
 *   SMTP_HOST + SMTP_USER/PASS → any SMTP server (Gmail app password, Brevo, Postmark, …)
 *   neither                    → prints the message to the server console and reports delivered: false,
 *                                so invite links and reset links can still be copied from the UI.
 */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type MailProvider = "resend" | "smtp" | "console";
export type MailResult = { ok: true; delivered: boolean } | { ok: false; error: string };

export function mailProvider(): MailProvider {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST) return "smtp";
  return "console";
}

export function mailConfigured(): boolean {
  return mailProvider() !== "console";
}

function fromAddress(): string {
  if (process.env.MAIL_FROM) return process.env.MAIL_FROM;
  if (mailProvider() === "smtp" && process.env.SMTP_USER) return `Kokoon Task <${process.env.SMTP_USER}>`;
  return "Kokoon Task <onboarding@resend.dev>";
}

/** Absolute origin for links in emails: APP_URL, else the current request's host. */
export async function appUrl(): Promise<string> {
  const fixed = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (fixed) return fixed.replace(/\/+$/, "");
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    /* outside a request (seed scripts, jobs) */
  }
  return "http://localhost:3000";
}

declare global {
  // eslint-disable-next-line no-var
  var __kokoonSmtp: Transporter | undefined;
}

function smtpTransport(): Transporter {
  if (globalThis.__kokoonSmtp) return globalThis.__kokoonSmtp;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
  });
  globalThis.__kokoonSmtp = transport;
  return transport;
}

export async function sendMail(msg: MailMessage): Promise<MailResult> {
  const provider = mailProvider();
  try {
    if (provider === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromAddress(), to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
      });
      if (!res.ok) return { ok: false, error: `Resend returned ${res.status}: ${(await res.text()).slice(0, 300)}` };
      console.log(`[mail] Sent "${msg.subject}" to ${msg.to} via Resend`);
      return { ok: true, delivered: true };
    }
    if (provider === "smtp") {
      await smtpTransport().sendMail({ from: fromAddress(), to: msg.to, subject: msg.subject, text: msg.text, html: msg.html });
      console.log(`[mail] Sent "${msg.subject}" to ${msg.to} via SMTP`);
      return { ok: true, delivered: true };
    }
    console.log(`\n[mail] Email not configured, so this was NOT sent.\n[mail] To: ${msg.to}\n[mail] Subject: ${msg.subject}\n${msg.text.split("\n").map((l) => `[mail] ${l}`).join("\n")}\n`);
    return { ok: true, delivered: false };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[mail] Failed to send "${msg.subject}" to ${msg.to}: ${error}`);
    return { ok: false, error };
  }
}
