import type { ReactNode } from "react";

type Tone = "neutral" | "good" | "warn" | "critical" | "accent";

const DOT: Record<Tone, string> = {
  neutral: "bg-ink-3",
  good: "bg-good",
  warn: "bg-warn",
  critical: "bg-critical",
  accent: "bg-accent",
};

export function StatTile({ label, value, hint, tone = "neutral", icon, emphasize = false }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone; icon?: ReactNode; emphasize?: boolean }) {
  return (
    <div className={`card p-4 min-w-0 ${emphasize ? "ring-2 ring-critical/30" : ""}`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-2">
        <span className={`size-2 rounded-full ${DOT[tone]}`} aria-hidden />
        <span className="truncate">{label}</span>
        {icon && <span className="ml-auto text-ink-3">{icon}</span>}
      </div>
      <div className="mt-2 text-[28px] leading-none font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1.5 text-xs text-ink-3">{hint}</div>}
    </div>
  );
}
