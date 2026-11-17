"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * An installed app keeps its last screen when reopened, which can be minutes or hours old. Whenever the
 * app comes back to the foreground, re-fetch the current page's data (at most once every 15 seconds)
 * so a task someone else just created or finished is there without a manual reload.
 */
export function RefreshOnReturn() {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last < 15_000) return;
      last = now;
      router.refresh();
    };
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) refresh(); };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", onShow);
    };
  }, [router]);
  return null;
}
