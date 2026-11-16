"use client";

import { useState } from "react";
import { GitBranchPlus, ShieldAlert, ShieldCheck } from "lucide-react";
import { clearFlag, createDependency, flagTask } from "@/lib/actions";
import { toDatetimeLocal } from "@/lib/format";
import type { TaskDTO, UserDTO } from "@/lib/types";
import { useAction } from "@/components/useAction";
import { Modal } from "@/components/ui/Modal";
import { UserCheckList } from "@/components/ui/UserCheckList";

function ErrorLine({ error }: { error: string | null }) {
  return error ? <p role="alert" className="text-xs text-critical-text bg-critical-soft rounded-lg px-2.5 py-1.5">{error}</p> : null;
}

/** "Add dependency": a real task for other people, due on or before this one. */
export function AddDependencyButton({ parent, users, currentUserId }: { parent: TaskDTO; users: UserDTO[]; currentUserId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState(toDatetimeLocal(parent.deadline));
  const [owners, setOwners] = useState<string[]>([]);
  const { run, pending, error, clearError } = useAction();
  const ready = title.trim().length >= 2 && !!deadline && owners.length > 0;
  const reset = () => { setTitle(""); setDescription(""); setDeadline(toDatetimeLocal(parent.deadline)); setOwners([]); clearError(); };
  return (
    <>
      <button type="button" onClick={() => { reset(); setOpen(true); }} className="btn btn-secondary btn-sm"><GitBranchPlus className="size-3.5" />Add dependency</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a dependency" wide>
        <div className="grid gap-3">
          <p className="text-xs text-ink-2 leading-relaxed">Something another person must deliver before this task can finish. It becomes a normal task for them, with its own deadline, and counts in their ownership score like any other task.</p>
          <div><label className="label" htmlFor="dep-title">What do you need?</label><input id="dep-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="input" placeholder="e.g. Final copy for the pricing page" autoFocus /></div>
          <div><label className="label" htmlFor="dep-desc">Details <span className="text-ink-3 font-normal">(optional)</span></label><textarea id="dep-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="textarea" placeholder="What exactly, and what does done look like?" /></div>
          <div className="grid sm:grid-cols-2 gap-3 items-start">
            <div>
              <label className="label" htmlFor="dep-deadline">Needed by</label>
              <input id="dep-deadline" type="datetime-local" value={deadline} max={toDatetimeLocal(parent.deadline)} onChange={(e) => setDeadline(e.target.value)} className="input" />
              <p className="mt-1 text-[11px] text-ink-3">On or before this task's deadline.</p>
            </div>
            <div>
              <div className="label">Who owns it</div>
              <UserCheckList users={users} selected={owners} onToggle={(id) => setOwners((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))} currentUserId={currentUserId} maxHeight="max-h-48" />
            </div>
          </div>
          <ErrorLine error={error} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={pending || !ready} onClick={() => run(() => createDependency(parent.id, { title, description, deadline, assigneeIds: owners }), () => setOpen(false))}>{pending ? "Adding…" : "Add dependency"}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/** Reviewer marks a done task as not actually done. Reopens it and costs the owners score. */
export function FlagButton({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { run, pending, error, clearError } = useAction();
  return (
    <>
      <button type="button" onClick={() => { setReason(""); clearError(); setOpen(true); }} className="btn btn-ghost btn-sm w-full text-critical-text"><ShieldAlert className="size-3.5" />Flag as not actually done</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Flag this task?">
        <div className="grid gap-3">
          <p className="text-xs text-ink-2 leading-relaxed">Use this when the task was marked done but the work isn't there. It is reopened, the owners are told, and it takes points off their ownership score until you clear the flag.</p>
          <div><label className="label" htmlFor="flag-reason">What's missing <span className="text-critical-text">*</span></label><textarea id="flag-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="textarea" placeholder="e.g. The endpoint returns mock data; nothing is wired to the database yet." /></div>
          <ErrorLine error={error} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={pending || reason.trim().length < 5} onClick={() => run(() => flagTask(taskId, reason), () => setOpen(false))}>{pending ? "Flagging…" : "Flag and reopen"}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function ClearFlagButton({ taskId, flagId }: { taskId: string; flagId: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const { run, pending, error, clearError } = useAction();
  return (
    <>
      <button type="button" onClick={() => { setNote(""); clearError(); setOpen(true); }} className="btn btn-secondary btn-sm"><ShieldCheck className="size-3.5" />Clear flag</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Clear this flag?">
        <div className="grid gap-3">
          <p className="text-xs text-ink-2 leading-relaxed">The penalty is lifted. Do this once the work is really done, or if the flag was a mistake.</p>
          <div><label className="label" htmlFor="clear-note">Note <span className="text-ink-3 font-normal">(optional)</span></label><input id="clear-note" value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="e.g. Verified in staging today." /></div>
          <ErrorLine error={error} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={pending} onClick={() => run(() => clearFlag(taskId, flagId, note), () => setOpen(false))}>{pending ? "Clearing…" : "Clear flag"}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
