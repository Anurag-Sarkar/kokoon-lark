"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Table2, BarChart3 } from "lucide-react";
import { CHART } from "./chartTheme";
import { ChartTooltipBox } from "./ChartTooltip";

export interface WorkloadRow { name: string; onTrack: number; dueSoon: number; overdue: number }

export function WorkloadChart({ rows, title, hint }: { rows: WorkloadRow[]; title: string; hint?: string }) {
  const [mounted, setMounted] = useState(false);
  const [table, setTable] = useState(false);
  useEffect(() => setMounted(true), []);
  const height = Math.max(160, rows.length * 36 + 48);
  const sorted = [...rows].sort((a, b) => (b.onTrack + b.dueSoon + b.overdue) - (a.onTrack + a.dueSoon + a.overdue));

  return (
    <div className="card p-4 sm:p-5 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {hint && <p className="text-xs text-ink-3 mt-0.5">{hint}</p>}
        </div>
        <button type="button" onClick={() => setTable((v) => !v)} className="btn btn-ghost btn-xs" aria-pressed={table}>
          {table ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
          {table ? "Chart" : "Table"}
        </button>
      </div>
      {table ? (
        <table className="w-full text-xs">
          <thead className="text-ink-3"><tr className="text-left"><th className="py-1.5 font-medium">Person</th><th className="py-1.5 font-medium text-right">On track</th><th className="py-1.5 font-medium text-right">Due soon</th><th className="py-1.5 font-medium text-right">Overdue</th></tr></thead>
          <tbody className="tnum">{sorted.map((r) => <tr key={r.name} className="border-t border-line"><td className="py-1.5">{r.name}</td><td className="py-1.5 text-right">{r.onTrack}</td><td className="py-1.5 text-right">{r.dueSoon}</td><td className="py-1.5 text-right">{r.overdue}</td></tr>)}</tbody>
        </table>
      ) : (
        <div style={{ height }}>
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid horizontal={false} stroke={CHART.grid} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={{ stroke: CHART.axis }} tick={{ fontSize: 11, fill: CHART.muted }} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={96} tick={{ fontSize: 12, fill: "#52514e" }} />
                <Tooltip
                  cursor={{ fill: "rgba(11,11,11,0.04)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const r = payload[0]!.payload as WorkloadRow;
                    return <ChartTooltipBox title={r.name} rows={[{ name: "On track", value: r.onTrack, color: CHART.accent }, { name: "Due soon", value: r.dueSoon, color: CHART.warn }, { name: "Overdue", value: r.overdue, color: CHART.critical }]} />;
                  }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: CHART.muted, paddingBottom: 8 }} />
                <Bar dataKey="onTrack" name="On track" stackId="w" fill={CHART.accent} maxBarSize={20} stroke={CHART.surface} strokeWidth={2} />
                <Bar dataKey="dueSoon" name="Due soon" stackId="w" fill={CHART.warn} maxBarSize={20} stroke={CHART.surface} strokeWidth={2} />
                <Bar dataKey="overdue" name="Overdue" stackId="w" fill={CHART.critical} maxBarSize={20} radius={[0, 4, 4, 0]} stroke={CHART.surface} strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
