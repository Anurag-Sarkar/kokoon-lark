"use client";

import { useActionState, useState } from "react";
import { KeyRound, UserMinus, UserPlus } from "lucide-react";
import { createUser, resetPassword, setUserActive, setUserRole, type FormState } from "@/lib/actions";
import type { Role, TeamDTO, UserDTO } from "@/lib/types";
import { useAction } from "@/components/useAction";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";

export function PeopleManager({ users, teams, currentUserId }: { users: UserDTO[]; teams: TeamDTO[]; currentUserId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createUser, undefined);
  const { run, error } = useAction();
  const [pwFor, setPwFor] = useState<UserDTO | null>(null);
  const [pw, setPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
      <div className="card overflow-hidden">
        {error && <p className="m-3 text-sm text-critical-text bg-critical-soft rounded-lg px-3 py-2">{error}</p>}
        <ul className="divide-y divide-line">
          {users.map((u) => {
            const self = u.id === currentUserId;
            return (
              <li key={u.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${u.active ? "" : "opacity-60"}`}>
                <Avatar user={u} size="md" />
                <div className="min-w-[180px] flex-1">
                  <div className="text-sm font-semibold truncate">{u.name}{self ? " (you)" : ""}{!u.active && <span className="ml-2 pill bg-line text-ink-2 h-5 text-[11px]">Deactivated</span>}</div>
                  <div className="text-xs text-ink-3 truncate">{u.email}{u.title ? ` · ${u.title}` : ""}</div>
                  {teams.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {teams.filter((t) => t.members.includes(u.id)).map((t) => (
                        <span key={t.id} className="pill h-5 text-[11px] bg-surface-2 text-ink-2 gap-1"><span className="size-1.5 rounded-full" style={{ backgroundColor: t.color }} aria-hidden />{t.name}</span>
                      ))}
                      {!teams.some((t) => t.members.includes(u.id)) && <span className="text-[11px] text-ink-3">Not in a team</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                <select value={u.role} disabled={self} onChange={(e) => run(() => setUserRole(u.id, e.target.value as Role))} className="select h-8 w-auto py-0 text-xs font-semibold" aria-label={`Role for ${u.name}`}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="button" onClick={() => { setPwFor(u); setPw(""); setPwMsg(null); }} className="btn btn-secondary btn-sm" title="Reset password"><KeyRound className="size-3.5" />Password</button>
                <button type="button" disabled={self} onClick={() => run(() => setUserActive(u.id, !u.active))} className={`btn btn-sm ${u.active ? "btn-danger" : "btn-secondary"}`}>
                  <UserMinus className="size-3.5" />{u.active ? "Deactivate" : "Reactivate"}
                </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <form action={action} className="card p-5 grid gap-3">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="size-4" />
          <h2 className="text-sm font-semibold">Add a person</h2>
        </div>
        <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" required className="input" /></div>
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="input" /></div>
        <div><label className="label" htmlFor="title">Title</label><input id="title" name="title" className="input" placeholder="Designer, Engineer…" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="role">Role</label><select id="role" name="role" defaultValue="member" className="select"><option value="member">Member</option><option value="admin">Admin</option></select></div>
          <div><label className="label" htmlFor="password">Temporary password</label><input id="password" name="password" type="text" required minLength={6} className="input" placeholder="min 6 chars" /></div>
        </div>
        {teams.length > 0 && (
          <fieldset>
            <legend className="label">Teams</legend>
            <div className="flex flex-wrap gap-1.5">
              {teams.map((t) => (
                <label key={t.id} className="inline-flex items-center gap-1.5 rounded-lg border border-line-2 px-2.5 py-1.5 text-xs font-medium cursor-pointer has-checked:bg-accent-soft has-checked:border-accent">
                  <input type="checkbox" name="teams" value={t.id} className="accent-ink size-3.5" />
                  <span className="size-2 rounded-full" style={{ backgroundColor: t.color }} aria-hidden />{t.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {state?.error && <p role="alert" className="text-sm text-critical-text bg-critical-soft rounded-lg px-3 py-2">{state.error}</p>}
        {state && !state.error && <p className="text-sm text-good-text bg-good-soft rounded-lg px-3 py-2">Added. Share the temporary password with them.</p>}
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Adding…" : "Add person"}</button>
      </form>

      <Modal open={!!pwFor} onClose={() => setPwFor(null)} title={`Reset password for ${pwFor?.name ?? ""}`}>
        <div className="grid gap-3">
          <input type="text" value={pw} onChange={(e) => setPw(e.target.value)} className="input" placeholder="New temporary password (min 6 chars)" />
          {pwMsg && <p className="text-sm text-good-text bg-good-soft rounded-lg px-3 py-2">{pwMsg}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setPwFor(null)}>Close</button>
            <button type="button" className="btn btn-primary" disabled={pw.length < 6} onClick={() => pwFor && run(() => resetPassword(pwFor.id, pw), () => setPwMsg("Password updated."))}>Set password</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
