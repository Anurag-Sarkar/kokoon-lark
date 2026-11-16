"use client";

import { useEffect, useState } from "react";
import { BellRing, Send } from "lucide-react";
import { getPushPublicKey, removePushSubscription, savePushSubscription, sendTestPush } from "@/lib/pushActions";

type Status = "checking" | "unsupported" | "no-worker" | "blocked" | "off" | "on";

function toKey(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Per-device Web Push opt-in. Lives on the Account page; needs the service worker, so it only works in production builds. */
export function PushToggle({ configured }: { configured: boolean }) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setStatus("unsupported");
      const reg = await navigator.serviceWorker.getRegistration("/");
      if (!reg) return setStatus("no-worker");
      if (Notification.permission === "denied") return setStatus("blocked");
      const sub = await reg.pushManager.getSubscription();
      if (!cancelled) setStatus(sub ? "on" : "off");
    })().catch(() => setStatus("unsupported"));
    return () => { cancelled = true; };
  }, []);

  const enable = async () => {
    setBusy(true); setError(null); setNote(null);
    try {
      const key = await getPushPublicKey();
      if (!key) throw new Error("Push notifications aren't set up on this server yet. Ask your admin to add the VAPID keys.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus(permission === "denied" ? "blocked" : "off"); throw new Error("Notifications weren't allowed. You can change that in your browser's site settings."); }
      const reg = await navigator.serviceWorker.getRegistration("/");
      if (!reg) throw new Error("The app's service worker isn't running on this page yet. Reload and try again.");
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) as BufferSource }));
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("This browser returned an incomplete subscription.");
      const r = await savePushSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } }, navigator.userAgent);
      if (!r.ok) throw new Error(r.error);
      setStatus("on"); setNote("Notifications are on for this device.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't turn on notifications.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true); setError(null); setNote(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await removePushSubscription(sub.endpoint); await sub.unsubscribe(); }
      setStatus("off"); setNote("This device won't get notifications any more.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't turn off notifications.");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true); setError(null); setNote(null);
    const r = await sendTestPush();
    if (!r.ok) setError(r.error); else setNote("Test sent. It should pop up on this device in a moment.");
    setBusy(false);
  };

  if (status === "checking") return <p className="text-xs text-ink-3">Checking this device…</p>;
  if (status === "unsupported") return <p className="text-xs text-ink-3">This browser doesn't support push notifications. On iPhone, add Kokoon Task to your Home Screen first, then open it from there.</p>;
  if (status === "no-worker") return <p className="text-xs text-ink-3">Notifications work in the installed app or the production site, not in the development server.</p>;
  if (status === "blocked") return <p className="text-xs text-critical-text">Notifications are blocked for this site in your browser. Allow them in the browser's site settings, then reload.</p>;

  const on = status === "on";
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" role="switch" aria-checked={on} onClick={on ? disable : enable} disabled={busy} className={`inline-flex items-center gap-2 rounded-[10px] border px-3 h-9 text-xs font-semibold transition ${on ? "bg-ink text-white border-ink" : "bg-surface border-line-2 text-ink-2"}`}>
          <BellRing className="size-3.5" />{busy ? "Working…" : on ? "On for this device" : "Notify me on this device"}
        </button>
        {on && <button type="button" onClick={test} disabled={busy} className="btn btn-secondary btn-sm"><Send className="size-3.5" />Send a test</button>}
      </div>
      {!configured && !on && <p className="text-xs text-warn-text">Push isn't configured on this server yet (no VAPID keys), so turning it on will fail until an admin adds them.</p>}
      {note && <p className="text-xs text-good-text">{note}</p>}
      {error && <p role="alert" className="text-xs text-critical-text bg-critical-soft rounded-lg px-2.5 py-1.5">{error}</p>}
    </div>
  );
}
