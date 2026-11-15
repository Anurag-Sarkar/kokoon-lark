import { AlertTriangle, CheckCircle2, Clock, Flame, Minus, TimerOff, TrendingDown, TrendingUp, Zap, Moon, Circle } from "lucide-react";
import { HEALTH_LABEL, LEVEL_META, type Level, type TaskHealth } from "@/lib/stats";
import { PRIORITY_LABEL, STATUS_LABEL, type Priority, type Status } from "@/lib/types";

export function HealthPill({ health, label }: { health: TaskHealth; label?: string }) {
  const map: Record<TaskHealth, { cls: string; Icon: typeof Clock }> = {
    done_on_time: { cls: "bg-good-soft text-good-text", Icon: CheckCircle2 },
    done_late: { cls: "bg-critical-soft text-critical-text", Icon: TimerOff },
    overdue: { cls: "bg-critical-soft text-critical-text", Icon: AlertTriangle },
    due_soon: { cls: "bg-warn-soft text-warn-text", Icon: Clock },
    on_track: { cls: "bg-accent-soft text-accent-deep", Icon: Circle },
  };
  const { cls, Icon } = map[health];
  return (
    <span className={`pill ${cls}`}>
      <Icon className="size-3.5" aria-hidden />
      {label ?? HEALTH_LABEL[health]}
    </span>
  );
}

export function LevelPill({ level, size = "md" }: { level: Level; size?: "sm" | "md" }) {
  const meta = LEVEL_META[level];
  const cls: Record<typeof meta.tone, string> = {
    good: "bg-good-soft text-good-text",
    accent: "bg-accent-soft text-accent-deep",
    warn: "bg-warn-soft text-warn-text",
    critical: "bg-critical-soft text-critical-text",
    muted: "bg-line text-ink-2",
  };
  const Icon = level === "crushing" ? Flame : level === "on_track" ? TrendingUp : level === "slipping" ? TrendingDown : level === "lagging" ? AlertTriangle : level === "idle" ? Moon : Minus;
  return (
    <span className={`pill ${cls[meta.tone]} ${size === "sm" ? "h-5 px-2 text-[11px]" : ""}`}>
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden />
      {meta.label}
    </span>
  );
}

export function StatusPill({ status }: { status: Status }) {
  const cls: Record<Status, string> = {
    todo: "bg-line text-ink-2",
    in_progress: "bg-accent-soft text-accent-deep",
    review: "bg-violet-soft text-violet",
    done: "bg-good-soft text-good-text",
  };
  return <span className={`pill ${cls[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function PriorityMark({ priority, withLabel = false }: { priority: Priority; withLabel?: boolean }) {
  const cls: Record<Priority, string> = {
    low: "text-ink-3",
    medium: "text-accent",
    high: "text-serious",
    urgent: "text-critical",
  };
  const bars = { low: 1, medium: 2, high: 3, urgent: 4 }[priority];
  return (
    <span className={`inline-flex items-center gap-1.5 ${cls[priority]}`} title={`${PRIORITY_LABEL[priority]} priority`}>
      {priority === "urgent" ? (
        <Zap className="size-3.5 fill-current" aria-hidden />
      ) : (
        <span className="inline-flex items-end gap-px h-3" aria-hidden>
          {[1, 2, 3].map((i) => (
            <span key={i} className={`w-[3px] rounded-sm ${i <= bars ? "bg-current" : "bg-line-2"}`} style={{ height: `${4 + i * 3}px` }} />
          ))}
        </span>
      )}
      {withLabel && <span className="text-xs font-semibold">{PRIORITY_LABEL[priority]}</span>}
    </span>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center h-5 px-1.5 rounded-md bg-surface-2 border border-line text-[11px] text-ink-2">{children}</span>;
}
