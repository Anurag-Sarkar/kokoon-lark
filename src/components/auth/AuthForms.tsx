"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { acceptInvite, changePassword, requestPasswordReset, resetPasswordWithToken, setEmailNotifications, signup, type AuthFormState } from "@/lib/authActions";
import { useAction } from "@/components/useAction";

function ErrorBox({ error }: { error?: string }) {
  if (!error) return null;
  return <p role="alert" className="text-sm text-critical-text bg-critical-soft rounded-lg px-3 py-2">{error}</p>;
}

function PasswordPair({ label = "New password", autoFocus = false }: { label?: string; autoFocus?: boolean }) {
  return (
    <>
      <div>
        <label className="label" htmlFor="password">{label}</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} autoFocus={autoFocus} className="input" placeholder="At least 8 characters" />
      </div>
      <div>
        <label className="label" htmlFor="confirm">Confirm password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} className="input" placeholder="Type it again" />
      </div>
    </>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signup, undefined);
  return (
    <form action={action} className="grid gap-4">
      <div><label className="label" htmlFor="name">Your name</label><input id="name" name="name" autoComplete="name" required className="input" placeholder="Anurag Sarkar" /></div>
      <div><label className="label" htmlFor="email">Work email</label><input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="you@company.com" /></div>
      <PasswordPair label="Password" />
      <ErrorBox error={state?.error} />
      <button type="submit" className="btn btn-primary h-10" disabled={pending}>{pending ? "Creating…" : "Create admin account"}</button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(requestPasswordReset, undefined);
  if (state?.done) {
    return (
      <div className="rounded-xl border border-good/40 bg-good-soft px-4 py-3 text-sm text-good-text">
        If there's an account for that email, a reset link is on its way. It works for 60 minutes. Check your spam folder if it doesn't show up.
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-4">
      <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required autoFocus className="input" placeholder="you@kokoon.ai" /></div>
      <ErrorBox error={state?.error} />
      <button type="submit" className="btn btn-primary h-10" disabled={pending}>{pending ? "Sending…" : "Email me a reset link"}</button>
    </form>
  );
}

export function SetPasswordForm({ token, mode }: { token: string; mode: "reset" | "invite" }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(mode === "reset" ? resetPasswordWithToken : acceptInvite, undefined);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <PasswordPair label={mode === "invite" ? "Choose a password" : "New password"} autoFocus />
      <ErrorBox error={state?.error} />
      <button type="submit" className="btn btn-primary h-10" disabled={pending}>{pending ? "Saving…" : mode === "invite" ? "Set password and sign in" : "Change password and sign in"}</button>
      {state?.error && <Link href={mode === "invite" ? "/login" : "/forgot-password"} className="text-sm text-accent-deep hover:underline text-center">{mode === "invite" ? "Back to sign in" : "Request a new link"}</Link>}
    </form>
  );
}

export function ChangePasswordForm({ required, hasPassword }: { required: boolean; hasPassword: boolean }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(changePassword, undefined);
  const askCurrent = !required && hasPassword;
  return (
    <form action={action} className="grid gap-4 max-w-sm">
      {askCurrent && (
        <div><label className="label" htmlFor="current">Current password</label><input id="current" name="current" type="password" autoComplete="current-password" required className="input" /></div>
      )}
      <PasswordPair autoFocus={required} />
      <ErrorBox error={state?.error} />
      {state?.done && <p className="text-sm text-good-text bg-good-soft rounded-lg px-3 py-2">Password changed.</p>}
      <button type="submit" className="btn btn-primary h-10" disabled={pending}>{pending ? "Saving…" : required ? "Set password and continue" : "Change password"}</button>
    </form>
  );
}

export function NotificationsToggle({ enabled: initial }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const { run, pending, error } = useAction();
  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    run(() => setEmailNotifications(next));
  };
  return (
    <div className="grid gap-2">
      <button type="button" role="switch" aria-checked={enabled} onClick={toggle} disabled={pending} className={`inline-flex items-center gap-2 self-start rounded-[10px] border px-3 h-9 text-xs font-semibold transition ${enabled ? "bg-ink text-white border-ink" : "bg-surface border-line-2 text-ink-2"}`}>
        {enabled ? <Bell className="size-3.5" /> : <BellOff className="size-3.5" />}
        {enabled ? "Emails on" : "Emails off"}
      </button>
      <ErrorBox error={error ?? undefined} />
    </div>
  );
}
