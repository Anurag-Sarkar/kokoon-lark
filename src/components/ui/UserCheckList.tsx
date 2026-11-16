"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { UserDTO } from "@/lib/types";
import { Avatar } from "./Avatar";

/**
 * Searchable checklist of people. Controlled: pass `selected` + `onToggle`.
 * With `name`, the selected ids are submitted as hidden inputs, so a search filter never drops a choice.
 */
export function UserCheckList({
  users, selected, onToggle, name, currentUserId, searchable, emptyLabel = "No people yet.", className = "", maxHeight = "max-h-72",
}: {
  users: UserDTO[];
  selected: string[];
  onToggle: (id: string) => void;
  name?: string;
  currentUserId?: string;
  searchable?: boolean;
  emptyLabel?: string;
  className?: string;
  maxHeight?: string;
}) {
  const [q, setQ] = useState("");
  const showSearch = searchable ?? users.length > 5;
  const query = q.trim().toLowerCase();
  const shown = useMemo(
    () => (query ? users.filter((u) => `${u.name} ${u.email} ${u.title}`.toLowerCase().includes(query)) : users),
    [users, query]
  );
  const hiddenSelected = query ? selected.filter((id) => !shown.some((u) => u.id === id)).length : 0;

  return (
    <div className={`grid gap-2 ${className}`}>
      {showSearch && (
        <label className="relative block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ink-3" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input h-9 pl-8" placeholder="Search by name or email" aria-label="Search people" />
        </label>
      )}
      {name && selected.map((id) => <input key={id} type="hidden" name={name} value={id} />)}
      <ul className={`grid gap-1 ${maxHeight} overflow-auto scrollbar-thin rounded-xl border border-line p-1`}>
        {shown.map((u) => {
          const on = selected.includes(u.id);
          return (
            <li key={u.id}>
              <label className={`flex items-center gap-3 rounded-lg px-2 py-1.5 cursor-pointer transition ${on ? "bg-accent-soft" : "hover:bg-surface-2"}`}>
                <input type="checkbox" checked={on} onChange={() => onToggle(u.id)} className="accent-ink size-4" />
                <Avatar user={u} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium truncate">
                    {u.name}{u.id === currentUserId ? " (you)" : ""}
                    {!u.active && <span className="ml-2 text-[11px] text-ink-3">(deactivated)</span>}
                  </span>
                  <span className="block text-[11px] text-ink-3 truncate">{u.title || (u.role === "admin" ? "Admin" : "Member")}{query ? ` · ${u.email}` : ""}</span>
                </span>
              </label>
            </li>
          );
        })}
        {shown.length === 0 && <li className="px-2 py-3 text-xs text-ink-3">{users.length === 0 ? emptyLabel : `Nobody matches “${q.trim()}”.`}</li>}
      </ul>
      <p className="text-[11px] text-ink-3 tnum">{selected.length} selected{hiddenSelected > 0 ? ` · ${hiddenSelected} hidden by the search` : ""}</p>
    </div>
  );
}
