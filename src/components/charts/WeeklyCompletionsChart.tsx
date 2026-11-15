"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Table2, BarChart3 } from "lucide-react";
import type { WeekBucket } from "@/lib/stats";
import { CHART } from "./chartTheme";
import { ChartTooltipBox } from "./ChartTooltip";

export function WeeklyCompletionsChart({ data, title, hint, height = 220 }: { data: WeekBucket[]; title: string; hint?: string; height?: number }) {
  const [mounted, setMounted] = useState(false);
  const [table, setTable] = useState(false);
  useEffect(() => setMounted(true), []);
  const total = data.reduce((a, b) => a + b.onTime + b.late, 0);

  return (
    <div className="card p-4 sm:p-5 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {hint && <p className="text-xs text-ink-3 mt-0.5">{hint}</p>}
        </div>
        <button type="button" onClick={() => setTable((v) => !v)} className="btn btn-ghost btn-xs" aria-pressed={table} title={table ? "Show chart" : "Show table"}>
          {table ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
          {table ? "Chart" : "Table"}
        </button>
      </div>

      {table ? (
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead className="text-ink-3">
              <tr className="text-left"><th className="py-1.5 font-medium">Week of</th><th className="py-1.5 font-medium text-right">On time</th><th className="py-1.5 font-medium text-right">Late</th><th className="py-1.5 font-medium text-right">Total</th></tr>
            </thead>
            <tbody className="tnum">
              {data.map((d) => (
                <tr key={d.weekStart} className="border-t border-line"><td className="py-1.5">{d.label}</td><td className="py-1.5 text-right">{d.onTime}</td><td className="py-1.5 text-right">{d.late}</td><td className="py-1.5 text-right font-semibold">{d.onTime + d.late}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : total === 0 ? (
        <div className="grid place-items-center text-xs text-ink-3" style={{ height }}>No completions in this period yet.</div>
      ) : (
        <div style={{ height }} className="-ml-2">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: CHART.axis }} tick={{ fontSize: 11, fill: CHART.muted }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} tick={{ fontSize: 11, fill: CHART.muted }} />
                <Tooltip
                  cursor={{ fill: "rgba(11,11,11,0.04)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]!.payload as WeekBucket;
                    return <ChartTooltipBox title={`Week of ${label}`} rows={[{ name: "On time", value: row.onTime, color: CHART.good }, { name: "Late", value: row.late, color: CHART.critical }]} />;
                  }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: CHART.muted, paddingBottom: 8 }} />
                <Bar dataKey="onTime" name="On time" stackId="a" fill={CHART.good} maxBarSize={24} stroke={CHART.surface} strokeWidth={2} />
                <Bar dataKey="late" name="Late" stackId="a" fill={CHART.critical} maxBarSize={24} radius={[4, 4, 0, 0]} stroke={CHART.surface} strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
