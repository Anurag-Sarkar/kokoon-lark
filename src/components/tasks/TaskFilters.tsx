"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, LayoutList, Search, SquareKanban, X } from "lucide-react";
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, type TeamDTO, type UserDTO } from "@/lib/types";
import type { Period } from "@/lib/period";

const KEEP_ON_CLEAR = ["view", "scope", "team", "done", "range", "at"];

export type Scope = "mine" | "team" | "all";

export function TaskFilters({ users, teams, isAdmin, scope, teamId, period, showDone }: {
  users: UserDTO[];
  /** Teams this person may pick from: every team for admins, their own teams for members */
  teams: TeamDTO[];
  isAdmin: boolean;
  scope: Scope;
  /** Selected team id, or "" for all of the person's teams */
  teamId: string;
  period: Period;
  showDone: boolean;
}) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");

  const setMany = (entries: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [key, value] of Object.entries(entries)) { if (value) next.set(key, value); else next.delete(key); }
    router.replace(`${path}?${next.toString()}`, { scroll: false });
  };
  const set = (key: string, value: string) => setMany({ [key]: value });

  useEffect(() => {
    const current = sp.get("q") ?? "";
    if (q === current) return;
    const id = setTimeout(() => set("q", q), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const view = sp.get("view") ?? "list";
  const status = sp.get("status") ?? "";
  const active = ["status", "priority", "assignee", "q"].filter((k) => sp.get(k)).length;

  const scopes: [Scope, string][] = isAdmin
    ? [["mine", "My tasks"], ["team", "Team"], ["all", "Everyone"]]
    : [["mine", "My tasks"], ["team", "My team"]];
  const memberIds = new Set((teamId ? teams.filter((t) => t.id === teamId) : teams).flatMap((t) => t.members));
  const ownerOptions = scope === "team" ? users.filter((u) => memberIds.has(u.id)) : users;

  const toggleDone = () => {
    if (showDone) setMany({ done: "", range: "", at: "", status: status === "done" ? "" : status });
    else set("done", "1");
  };
  const clearFilters = () => {
    setQ("");
    const next = new URLSearchParams();
    for (const k of KEEP_ON_CLEAR) { const v = sp.get(k); if (v) next.set(k, v); }
    router.replace(`${path}?${next.toString()}`, { scroll: false });
  };

  const seg = (on: boolean) => `h-8 px-3 rounded-lg text-xs font-semibold transition ${on ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-2"}`;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      <div className="relative">
        <Search className="size-4 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks" className="input pl-8 h-9 w-52" aria-label="Search tasks" />
      </div>
      <div className="inline-flex rounded-[10px] border border-line-2 bg-surface p-0.5">
        {scopes.map(([v, l]) => (
          <button key={v} type="button" onClick={() => setMany({ scope: v, team: "", assignee: "" })} className={seg(scope === v)}>{l}</button>
        ))}
      </div>
      {scope === "team" && teams.length > (isAdmin ? 0 : 1) && (
        <select value={teamId} onChange={(e) => setMany({ team: e.target.value, assignee: "" })} className="select h-9 w-auto py-0 text-xs font-semibold" aria-label="Team">
          {!isAdmin && <option value="">All my teams</option>}
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      )}
      <select value={status} onChange={(e) => set("status", e.target.value)} className="select h-9 w-auto py-0 text-xs font-semibold" aria-label="Status">
        <option value="">Any status</option>
        <option value="open">Open</option>
        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
      <select value={sp.get("priority") ?? ""} onChange={(e) => set("priority", e.target.value)} className="select h-9 w-auto py-0 text-xs font-semibold" aria-label="Priority">
        <option value="">Any priority</option>
        {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
      </select>
      {scope !== "mine" && ownerOptions.length > 0 && (
        <select value={sp.get("assignee") ?? ""} onChange={(e) => set("assignee", e.target.value)} className="select h-9 w-auto py-0 text-xs font-semibold" aria-label="Owner">
          <option value="">Any owner</option>
          {ownerOptions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      )}

      <button
        type="button"
        onClick={toggleDone}
        aria-pressed={showDone}
        className={`h-9 px-3 rounded-[10px] border text-xs font-semibold inline-flex items-center gap-1.5 transition ${showDone ? "bg-ink text-white border-ink" : "bg-surface border-line-2 text-ink-2 hover:bg-surface-2"}`}
      >
        <CheckCircle2 className="size-3.5" />Completed
      </button>

      {showDone && isAdmin && (
        <div className="inline-flex items-center gap-1 rounded-[10px] border border-line-2 bg-surface p-0.5" role="group" aria-label="Completed period">
          <button type="button" onClick={() => set("range", "")} className={seg(period.granularity === "week")}>Week</button>
          <button type="button" onClick={() => set("range", "day")} className={seg(period.granularity === "day")}>Day</button>
          <span className="mx-0.5 h-5 w-px bg-line-2" aria-hidden />
          <button type="button" onClick={() => set("at", period.prevAnchor)} className="btn btn-ghost size-8 p-0 rounded-lg" aria-label={period.granularity === "week" ? "Previous week" : "Previous day"}><ChevronLeft className="size-4" /></button>
          <span className="px-1 text-xs font-semibold whitespace-nowrap tnum">
            {period.label}
            {period.rangeLabel && <span className="text-ink-3 font-normal"> · {period.rangeLabel}</span>}
          </span>
          <button type="button" onClick={() => period.nextAnchor && set("at", period.nextAnchor)} disabled={!period.nextAnchor} className="btn btn-ghost size-8 p-0 rounded-lg disabled:opacity-30" aria-label={period.granularity === "week" ? "Next week" : "Next day"}><ChevronRight className="size-4" /></button>
          {!period.isCurrent && <button type="button" onClick={() => set("at", "")} className="btn btn-ghost btn-xs mr-0.5">{period.granularity === "week" ? "This week" : "Today"}</button>}
        </div>
      )}
      {showDone && !isAdmin && (
        <span className="text-xs text-ink-3 whitespace-nowrap">{period.label}{period.rangeLabel && ` · ${period.rangeLabel}`}</span>
      )}

      {active > 0 && (
        <button type="button" onClick={clearFilters} className="btn btn-ghost btn-sm"><X className="size-3.5" />Clear</button>
      )}
      <div className="ml-auto inline-flex rounded-[10px] border border-line-2 bg-surface p-0.5">
        <button type="button" onClick={() => set("view", "")} className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition ${view !== "board" ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-2"}`}><LayoutList className="size-3.5" />List</button>
        <button type="button" onClick={() => set("view", "board")} className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition ${view === "board" ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-2"}`}><SquareKanban className="size-3.5" />Board</button>
      </div>
    </div>
  );
}
