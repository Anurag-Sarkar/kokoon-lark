import type { Level } from "@/lib/stats";

const TONE: Record<Level, string> = {
  crushing: "var(--color-good)",
  on_track: "var(--color-accent)",
  slipping: "var(--color-warn)",
  lagging: "var(--color-critical)",
  idle: "var(--color-ink-3)",
  no_tasks: "var(--color-line-2)",
};

export function levelColor(level: Level): string {
  return TONE[level];
}

export function ScoreRing({ score, level, size = 120, stroke = 10, children }: { score: number | null; level: Level; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pctv = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const dash = c * pctv;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        {score !== null && (
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={TONE[level]} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            className="ring-arc"
            style={{ ["--ring-total" as string]: `${c}` }}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
