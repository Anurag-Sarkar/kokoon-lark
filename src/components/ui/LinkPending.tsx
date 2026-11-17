"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

/**
 * A spinner that appears while the surrounding <Link> is navigating, so a tap on a slow connection
 * visibly registers. Must render inside a Link. The `.nav-pending` class also lets the link itself
 * take a pressed look through CSS :has().
 */
export function LinkSpinner({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 className={`nav-pending pending-in size-3.5 shrink-0 animate-spin ${className}`} role="status" aria-label="Loading" />;
}
