"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound, Mail, Send, UserMinus, UserPlus } from "lucide-react";
import { createUser, resetPassword, setUserActive, setUserRole, type FormState } from "@/lib/actions";
import { resendInvite } from "@/lib/authActions";
import type { Role, TeamDTO, UserDTO } from "@/lib/types";
import { useAction } from "@/components/useAction";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked; the field is selectable */ }
  };
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="input h-8 text-xs font-mono flex-1 min-w-0" aria-label="Invite link" />
      <button type="button" onClick={copy} className="btn btn-secondary btn-sm shrink-0">{copied ? <><Check className="size-3.5" />Copied</> : <><Copy className="size-3.5" />Copy</>}</button>
    </div>
  );
}

export function PeopleManager({ users, teams, currentUserId, mailConfigured }: { users: UserDTO[]; teams: TeamDTO[]; currentUserId: string; mailConfigured: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createUser, undefined);
  const { run, pending: busy, error } = useAction();
  const [onboarding, setOnboarding] = useState<"invite" | "temp">("invite");
  const [pwFor, setPwFor] = useState<UserDTO | null>(null);
  const [pw, setPw] = useState("");
  const [pwNotify, setPwNotify] = useState(true);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [inviteLinks, setInviteLinks] = useState<Record<string, { link: string; delivered: boolean }>>({});

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
      <div className="card overflow-hidden">
        {error && <p className="m-3 text-sm text-critical-text bg-critical-soft rounded-lg px-3 py-2">{error}</p>}
        <ul className="divide-y divide-line">
          {users.map((u) => {
            const self = u.id === currentUserId;
            const invite = inviteLinks[u.id];
            return (
              <li key={u.id} className={`px-4 py-3 ${u.active ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar user={u} size="md" />
                  <div className="min-w-[180px] flex-1">
                    <div className="text-sm font-semibold truncate flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{u.name}{self ? " (you)" : ""}</span>
                      {!u.active && <span className="pill bg-line text-ink-2 h-5 text-[11px]">Deactivated</span>}
                      {u.active && !u.hasPassword && <span className="pill bg-warn-soft text-warn-text h-5 text-[11px]">Invited · no password yet</span>}
                      {u.active && u.hasPassword && u.mustChangePassword && <span className="pill bg-accent-soft text-accent-deep h-5 text-[11px]">Temporary password</span>}
                    </div>
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
                    {u.active && !u.hasPassword ? (
                      <button type="button" disabled={busy} onClick={() => run(() => resendInvite(u.id), (r) => setInviteLinks((m) => ({ ...m, [u.id]: { link: r.link, delivered: r.delivered } })))} className="btn btn-secondary btn-sm" title="Send a fresh invite link"><Send className="size-3.5" />Resend invite</button>
                    ) : (
                      <button type="button" onClick={() => { setPwFor(u); setPw(""); setPwNotify(true); setPwMsg(null); }} className="btn btn-secondary btn-sm" title="Reset password"><KeyRound className="size-3.5" />Password</button>
                    )}
                    <button type="button" disabled={self} onClick={() => run(() => setUserActive(u.id, !u.active))} className={`btn btn-sm ${u.active ? "btn-danger" : "btn-secondary"}`}>
                      <UserMinus className="size-3.5" />{u.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                </div>
                {invite && (
                  <div className="mt-2 rounded-lg bg-surface-2 p-3 text-xs text-ink-2 grid gap-2">
                    <span>{invite.delivered ? `A new invite was emailed to ${u.email}. You can also share the link directly:` : "Email isn't set up, so share this link with them yourself (it works for 7 days):"}</span>
                    <CopyLink link={invite.link} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <form key={state?.message ?? "fresh"} action={action} className="card p-5 grid gap-3">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="size-4" />
          <h2 className="text-sm font-semibold">Add a person</h2>
        </div>
        <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" required className="input" /></div>
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="input" /></div>
        <div><label className="label" htmlFor="title">Title</label><input id="title" name="title" className="input" placeholder="Designer, Engineer…" /></div>
        <div><label className="label" htmlFor="role">Role</label><select id="role" name="role" defaultValue="member" className="select"><option value="member">Member</option><option value="admin">Admin</option></select></div>

        <fieldset>
          <legend className="label">How they get in</legend>
          <div className="grid gap-1.5">
            {([
              ["invite", "Email them an invite", "They choose their own password from a link that works for 7 days."],
              ["temp", "Set a temporary password", "They sign in with it and must change it right away."],
            ] as const).map(([value, label, hint]) => (
              <label key={value} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition ${onboarding === value ? "border-ink bg-surface-2" : "border-line-2 hover:bg-surface-2"}`}>
                <input type="radio" name="onboarding" value={value} checked={onboarding === value} onChange={() => setOnboarding(value)} className="accent-ink mt-0.5" />
                <span className="min-w-0"><span className="block text-sm font-medium">{label}</span><span className="block text-[11px] text-ink-3">{hint}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        {onboarding === "temp" && (
          <div><label className="label" htmlFor="password">Temporary password</label><input id="password" name="password" type="text" required minLength={6} className="input" placeholder="min 6 chars" autoComplete="off" /></div>
        )}
        {!mailConfigured && (
          <p className="text-[11px] text-ink-3 inline-flex items-start gap-1.5"><Mail className="size-3.5 shrink-0 mt-px" /><span>Email isn't set up yet, so invite links and passwords will be shown here for you to share. See the README to connect Resend or SMTP.</span></p>
        )}

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
        {state?.message && (
          <div className={`text-sm rounded-lg px-3 py-2 grid gap-2 ${state.delivered ? "text-good-text bg-good-soft" : "text-warn-text bg-warn-soft"}`}>
            <span>{state.message}</span>
            {state.link && <CopyLink link={state.link} />}
          </div>
        )}
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Adding…" : onboarding === "invite" ? "Add and send invite" : "Create account"}</button>
      </form>

      <Modal open={!!pwFor} onClose={() => setPwFor(null)} title={`Reset password for ${pwFor?.name ?? ""}`}>
        <div className="grid gap-3">
          <input type="text" value={pw} onChange={(e) => setPw(e.target.value)} className="input" placeholder="New temporary password (min 6 chars)" autoComplete="off" />
          {pwFor && pwFor.id !== currentUserId && (
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pwNotify} onChange={(e) => setPwNotify(e.target.checked)} className="accent-ink size-4" />
              Email it to {pwFor.name.split(" ")[0]}{!mailConfigured && <span className="text-xs text-ink-3">(email isn't set up, so nothing will be sent)</span>}
            </label>
          )}
          <p className="text-xs text-ink-3">{pwFor?.id === currentUserId ? "This changes your own password immediately." : "They'll be asked to choose their own password the next time they sign in."}</p>
          {pwMsg && <p className="text-sm text-good-text bg-good-soft rounded-lg px-3 py-2">{pwMsg}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setPwFor(null)}>Close</button>
            <button type="button" className="btn btn-primary" disabled={pw.length < 6 || busy} onClick={() => pwFor && run(() => resetPassword(pwFor.id, pw, pwNotify), (r) => setPwMsg(r.delivered ? "Password updated and emailed to them." : pwFor.id === currentUserId ? "Your password was updated." : "Password updated. Share it with them yourself."))}>Set password</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
