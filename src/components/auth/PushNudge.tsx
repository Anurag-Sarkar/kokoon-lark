"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, X } from "lucide-react";
import { getPushPublicKey, savePushSubscription } from "@/lib/pushActions";

const DISMISS_KEY = "kt-push-nudge-dismissed";
const DISMISS_DAYS = 7;

function toKey(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/**
 * A one-line prompt on the dashboard for devices that can get push notifications but haven't been
 * turned on yet. Hidden where push isn't possible (no service worker, blocked, unsupported), once a
 * device is subscribed, and for a week after "Not now".
 */
export function PushNudge({ configured }: { configured: boolean }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!configured || typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
      if (Notification.permission === "denied") return;
      try {
        const until = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
        if (until > Date.now()) return;
      } catch { /* storage unavailable: just show it */ }
      const reg = await navigator.serviceWorker.getRegistration("/");
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (!cancelled && !sub) setShow(true);
    })().catch(() => undefined);
    return () => { cancelled = true; };
  }, [configured]);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000)); } catch { /* ignore */ }
  };

  const enable = async () => {
    setBusy(true); setError(null);
    try {
      const key = await getPushPublicKey();
      if (!key) throw new Error("Push isn't set up on this server yet.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notifications weren't allowed. You can change that in your browser's site settings.");
      const reg = await navigator.serviceWorker.getRegistration("/");
      if (!reg) throw new Error("Reload the app and try again.");
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) as BufferSource }));
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("This browser returned an incomplete subscription.");
      const r = await savePushSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } }, navigator.userAgent);
      if (!r.ok) throw new Error(r.error);
      setShow(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't turn on notifications.");
    } finally {
      setBusy(false);
    }
  };

  if (!show) return null;
  return (
    <div className="card p-4 flex flex-wrap items-center gap-3 border-l-4 border-l-accent fade-up" role="region" aria-label="Turn on notifications">
      <BellRing className="size-5 text-accent-deep shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">Get notified on this device</div>
        <div className="text-xs text-ink-3">When someone assigns you work or adds a dependency for you, when a deadline needs your approval or yours is decided, and two days before and on the day a task is due.</div>
        {error && <p role="alert" className="mt-1 text-xs text-critical-text">{error} <Link href="/account" className="underline">Account settings</Link></p>}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={enable} disabled={busy} className="btn btn-primary btn-sm">{busy ? "Working…" : "Turn on"}</button>
        <button type="button" onClick={dismiss} className="btn btn-ghost btn-sm px-2" aria-label="Not now"><X className="size-4" /></button>
      </div>
    </div>
  );
}
