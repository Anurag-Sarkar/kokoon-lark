"use client";

import { useActionState } from "react";
import { UsersRound } from "lucide-react";
import { createTeam, type FormState } from "@/lib/actions";
import type { UserDTO } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";

export const TEAM_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#6250d6", "#0b0b0b", "#e34948"];

export function ColorPicker({ name, value, onChange }: { name: string; value?: string; onChange?: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Team colour">
      {TEAM_COLORS.map((c, i) => (
        <label key={c} className="cursor-pointer" title={c}>
          <input type="radio" name={name} value={c} className="peer sr-only" defaultChecked={value === undefined ? i === 0 : undefined} checked={value === undefined ? undefined : value === c} onChange={() => onChange?.(c)} />
          <span className="block size-7 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-surface peer-checked:ring-ink peer-focus-visible:ring-accent transition" style={{ backgroundColor: c }} />
        </label>
      ))}
    </div>
  );
}

export function MemberPicker({ users, name, selected, onToggle }: { users: UserDTO[]; name?: string; selected?: string[]; onToggle?: (id: string) => void }) {
  return (
    <ul className="grid gap-1 max-h-72 overflow-auto scrollbar-thin rounded-xl border border-line p-1">
      {users.map((u) => {
        const on = selected?.includes(u.id);
        return (
          <li key={u.id}>
            <label className={`flex items-center gap-3 rounded-lg px-2 py-1.5 cursor-pointer ${on ? "bg-accent-soft" : "hover:bg-surface-2"}`}>
              <input type="checkbox" name={name} value={u.id} checked={selected ? !!on : undefined} onChange={() => onToggle?.(u.id)} className="accent-ink size-4" />
              <Avatar user={u} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium truncate">{u.name}{!u.active && <span className="ml-2 text-[11px] text-ink-3">(deactivated)</span>}</span>
                <span className="block text-[11px] text-ink-3 truncate">{u.title || (u.role === "admin" ? "Admin" : "Member")}</span>
              </span>
            </label>
          </li>
        );
      })}
      {users.length === 0 && <li className="px-2 py-3 text-xs text-ink-3">No people yet. Add people first.</li>}
    </ul>
  );
}

export function TeamForm({ users }: { users: UserDTO[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createTeam, undefined);
  return (
    <form action={action} className="card p-5 grid gap-3">
      <div className="flex items-center gap-2 mb-1">
        <UsersRound className="size-4" />
        <h2 className="text-sm font-semibold">New team</h2>
      </div>
      <div><label className="label" htmlFor="team-name">Name</label><input id="team-name" name="name" required minLength={2} className="input" placeholder="Product, Growth, Ops…" /></div>
      <div><label className="label" htmlFor="team-description">What they own</label><input id="team-description" name="description" className="input" placeholder="Optional one-liner" /></div>
      <div><div className="label">Colour</div><ColorPicker name="color" /></div>
      <div><div className="label">Members</div><MemberPicker users={users} name="members" /></div>
      {state?.error && <p role="alert" className="text-sm text-critical-text bg-critical-soft rounded-lg px-3 py-2">{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Creating…" : "Create team"}</button>
    </form>
  );
}
