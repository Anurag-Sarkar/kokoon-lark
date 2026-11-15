"use client";

export function ChartTooltipBox({ title, rows }: { title: string; rows: { name: string; value: number | string; color?: string }[] }) {
  return (
    <div className="card px-3 py-2 text-xs" style={{ boxShadow: "var(--shadow-pop)" }}>
      <div className="font-semibold mb-1">{title}</div>
      <div className="grid gap-0.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-ink-2">
              {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}
              {r.name}
            </span>
            <span className="tnum font-semibold">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
