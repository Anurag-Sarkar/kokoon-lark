"use client";

import { useActionState, useState } from "react";
import { UsersRound } from "lucide-react";
import { createTeam, type FormState } from "@/lib/actions";
import type { UserDTO } from "@/lib/types";
import { UserCheckList } from "@/components/ui/UserCheckList";

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

export function OwnerSelect({ users, value, onChange, name, id = "team-owner" }: { users: UserDTO[]; value: string; onChange: (id: string) => void; name?: string; id?: string }) {
  return (
    <select id={id} name={name} value={value} onChange={(e) => onChange(e.target.value)} className="select">
      <option value="">No owner yet</option>
      {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}{u.role === "admin" ? " (admin)" : ""}</option>)}
    </select>
  );
}

export function MemberPicker({ users, selected, onToggle, name }: { users: UserDTO[]; selected: string[]; onToggle: (id: string) => void; name?: string }) {
  return <UserCheckList users={users} selected={selected} onToggle={onToggle} name={name} emptyLabel="No people yet. Add people first." />;
}

export function TeamForm({ users }: { users: UserDTO[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createTeam, undefined);
  const [members, setMembers] = useState<string[]>([]);
  const [owner, setOwner] = useState("");
  const toggle = (id: string) => setMembers((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const pickOwner = (id: string) => {
    setOwner(id);
    if (id && !members.includes(id)) setMembers((s) => [...s, id]);
  };
  return (
    <form action={action} className="card p-5 grid gap-3">
      <div className="flex items-center gap-2 mb-1">
        <UsersRound className="size-4" />
        <h2 className="text-sm font-semibold">New team</h2>
      </div>
      <div><label className="label" htmlFor="team-name">Name</label><input id="team-name" name="name" required minLength={2} className="input" placeholder="Product, Growth, Ops…" /></div>
      <div><label className="label" htmlFor="team-description">What they own</label><input id="team-description" name="description" className="input" placeholder="Optional one-liner" /></div>
      <div><div className="label">Colour</div><ColorPicker name="color" /></div>
      <div>
        <label className="label" htmlFor="team-owner">Team owner</label>
        <OwnerSelect users={users} value={owner} onChange={pickOwner} name="owner" />
        <p className="mt-1 text-[11px] text-ink-3">Approves deadline changes that members ask for. The owner's own changes go to an admin.</p>
      </div>
      <div><div className="label">Members</div><MemberPicker users={users} selected={members} onToggle={toggle} name="members" /></div>
      {state?.error && <p role="alert" className="text-sm text-critical-text bg-critical-soft rounded-lg px-3 py-2">{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Creating…" : "Create team"}</button>
    </form>
  );
}
