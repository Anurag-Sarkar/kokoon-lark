"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutList, Search, SquareKanban, X } from "lucide-react";
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, type UserDTO } from "@/lib/types";

export function TaskFilters({ users, isAdmin }: { users: UserDTO[]; isAdmin: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.replace(`${path}?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const current = sp.get("q") ?? "";
    if (q === current) return;
    const id = setTimeout(() => set("q", q), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const view = sp.get("view") ?? "list";
  const scope = sp.get("scope") ?? (isAdmin ? "all" : "mine");
  const active = ["status", "priority", "assignee", "q"].filter((k) => sp.get(k)).length;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      <div className="relative">
        <Search className="size-4 text-ink-3 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks" className="input pl-8 h-9 w-52" aria-label="Search tasks" />
      </div>
      <div className="inline-flex rounded-[10px] border border-line-2 bg-surface p-0.5">
        {([["mine", "My tasks"], ["all", "Everyone"]] as const).map(([v, l]) => (
          <button key={v} type="button" onClick={() => set("scope", v)} className={`h-8 px-3 rounded-lg text-xs font-semibold transition ${scope === v ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-2"}`}>{l}</button>
        ))}
      </div>
      <select value={sp.get("status") ?? ""} onChange={(e) => set("status", e.target.value)} className="select h-9 w-auto py-0 text-xs font-semibold" aria-label="Status">
        <option value="">Any status</option>
        <option value="open">Open</option>
        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
      <select value={sp.get("priority") ?? ""} onChange={(e) => set("priority", e.target.value)} className="select h-9 w-auto py-0 text-xs font-semibold" aria-label="Priority">
        <option value="">Any priority</option>
        {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
      </select>
      {scope === "all" && (
        <select value={sp.get("assignee") ?? ""} onChange={(e) => set("assignee", e.target.value)} className="select h-9 w-auto py-0 text-xs font-semibold" aria-label="Owner">
          <option value="">Any owner</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      )}
      {active > 0 && (
        <button type="button" onClick={() => { setQ(""); router.replace(`${path}?${new URLSearchParams({ ...(sp.get("view") ? { view: sp.get("view")! } : {}), ...(sp.get("scope") ? { scope: sp.get("scope")! } : {}) }).toString()}`); }} className="btn btn-ghost btn-sm"><X className="size-3.5" />Clear</button>
      )}
      <div className="ml-auto inline-flex rounded-[10px] border border-line-2 bg-surface p-0.5">
        <button type="button" onClick={() => set("view", "")} className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition ${view !== "board" ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-2"}`}><LayoutList className="size-3.5" />List</button>
        <button type="button" onClick={() => set("view", "board")} className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition ${view === "board" ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-2"}`}><SquareKanban className="size-3.5" />Board</button>
      </div>
    </div>
  );
}
