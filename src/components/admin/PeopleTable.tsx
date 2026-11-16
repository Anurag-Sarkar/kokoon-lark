"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { Level } from "@/lib/stats";
import { Avatar } from "@/components/ui/Avatar";
import { LevelPill } from "@/components/ui/Pills";

export interface PersonRow {
  id: string;
  name: string;
  color: string;
  title: string;
  level: Level;
  score: number | null;
  ongoing: number;
  overdue: number;
  dueSoon: number;
  doneOnTime: number;
  doneLate: number;
  onTimeRate: number | null;
  moves30: number;
  flags30: number;
  lastActivityLabel: string;
  lastActivityTs: number;
}

type Key = keyof Pick<PersonRow, "name" | "score" | "ongoing" | "overdue" | "dueSoon" | "doneOnTime" | "doneLate" | "onTimeRate" | "moves30" | "flags30" | "lastActivityTs">;

const COLS: { key: Key; label: string; align?: "right"; title?: string }[] = [
  { key: "name", label: "Person" },
  { key: "score", label: "Score", align: "right" },
  { key: "ongoing", label: "Open", align: "right" },
  { key: "overdue", label: "Overdue", align: "right" },
  { key: "dueSoon", label: "Due 48h", align: "right" },
  { key: "doneOnTime", label: "On time", align: "right", title: "Completed on or before the deadline" },
  { key: "doneLate", label: "Late", align: "right", title: "Completed after the deadline" },
  { key: "onTimeRate", label: "On-time %", align: "right" },
  { key: "moves30", label: "Moves 30d", align: "right", title: "Deadline changes made by this person in the last 30 days" },
  { key: "flags30", label: "Flags 30d", align: "right", title: "Tasks they marked done that a reviewer flagged as not actually done, last 30 days" },
  { key: "lastActivityTs", label: "Last active", align: "right" },
];

export function PeopleTable({ rows }: { rows: PersonRow[] }) {
  const [sort, setSort] = useState<{ key: Key; dir: "asc" | "desc" }>({ key: "score", dir: "asc" });
  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      let cmp = 0;
      if (typeof av === "string" && typeof bv === "string") cmp = av.localeCompare(bv);
      else cmp = (Number(av ?? -1)) - (Number(bv ?? -1));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [rows, sort]);

  const click = (key: Key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }));

  return (
    <div className="card overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm min-w-[940px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-ink-3 border-b border-line">
            {COLS.map((c) => (
              <th key={c.key} className={`px-3 py-2.5 font-semibold whitespace-nowrap ${c.align === "right" ? "text-right" : ""}`} title={c.title}>
                <button type="button" onClick={() => click(c.key)} className={`inline-flex items-center gap-1 hover:text-ink ${sort.key === c.key ? "text-ink" : ""}`}>
                  {c.label}
                  {sort.key === c.key ? (sort.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-50" />}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tnum">
          {sorted.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-b-0 hover:bg-surface-2">
              <td className="px-3 py-2.5">
                <Link href={`/admin/people/${r.id}`} className="flex items-center gap-2.5 min-w-0">
                  <Avatar user={r} size="sm" />
                  <span className="min-w-0">
                    <span className="block font-medium truncate hover:underline">{r.name}</span>
                    <span className="block text-[11px] text-ink-3 truncate">{r.title}</span>
                  </span>
                  <span className="ml-2"><LevelPill level={r.level} size="sm" /></span>
                </Link>
              </td>
              <td className="px-3 py-2.5 text-right font-semibold">{r.score ?? "–"}</td>
              <td className="px-3 py-2.5 text-right">{r.ongoing}</td>
              <td className={`px-3 py-2.5 text-right ${r.overdue > 0 ? "text-critical-text font-semibold" : ""}`}>{r.overdue}</td>
              <td className={`px-3 py-2.5 text-right ${r.dueSoon > 0 ? "text-warn-text font-semibold" : ""}`}>{r.dueSoon}</td>
              <td className="px-3 py-2.5 text-right">{r.doneOnTime}</td>
              <td className={`px-3 py-2.5 text-right ${r.doneLate > 0 ? "text-critical-text" : ""}`}>{r.doneLate}</td>
              <td className="px-3 py-2.5 text-right">{r.onTimeRate === null ? "–" : `${Math.round(r.onTimeRate * 100)}%`}</td>
              <td className={`px-3 py-2.5 text-right ${r.moves30 >= 2 ? "text-warn-text font-semibold" : ""}`}>{r.moves30}</td>
              <td className={`px-3 py-2.5 text-right ${r.flags30 > 0 ? "text-critical-text font-semibold" : ""}`}>{r.flags30}</td>
              <td className="px-3 py-2.5 text-right text-ink-2">{r.lastActivityLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
