"use client";

import { useEffect } from "react";

/** Registers the service worker in production builds only, so dev never serves stale cached pages. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}
