"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Dialog that always fits the screen: centred on desktop, a bottom sheet on phones, and never taller
 * than the viewport. The body scrolls, so the buttons at the end stay reachable even with the keyboard up.
 */
export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div
        className={`relative card w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} flex max-h-[calc(100dvh-0.75rem)] flex-col rounded-b-none sm:max-h-[calc(100dvh-2rem)] sm:rounded-b-[14px] fade-up`}
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm px-2" aria-label="Close"><X className="size-4" /></button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 scrollbar-thin" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
