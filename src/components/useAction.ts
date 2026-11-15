"use client";

import { useCallback, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/types";

export function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = useCallback((fn: () => Promise<ActionResult>, onOk?: () => void) => {
    start(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error);
      else onOk?.();
    });
  }, []);
  return { run, pending, error, clearError: () => setError(null) };
}
