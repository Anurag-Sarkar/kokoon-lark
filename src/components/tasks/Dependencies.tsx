"use client";

import { useState } from "react";
import { GitBranchPlus, Pencil, ShieldAlert, ShieldCheck } from "lucide-react";
import { changeDeadline, clearFlag, createDependency, flagTask, setAssignees, updateTaskDetails } from "@/lib/actions";
import { fmtShortDateTime, toDatetimeLocal } from "@/lib/format";
import { pendingDeadlineRequest } from "@/lib/approvals";
import type { ActionResult, TaskDTO, UserDTO } from "@/lib/types";
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

/**
 * Edit a dependency from the task it feeds: title, details, owners and, with a reason, its deadline.
 * The deadline goes through the usual rules: admins move it directly, everyone else sends a request.
 */
export function EditDependencyButton({ task, parent, users, currentUserId, direct }: { task: TaskDTO; parent: TaskDTO; users: UserDTO[]; currentUserId: string; /** true when this person's deadline changes apply without approval */ direct: boolean }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [deadline, setDeadline] = useState(toDatetimeLocal(task.deadline));
  const [reason, setReason] = useState("");
  const [owners, setOwners] = useState<string[]>(task.assignees);
  const [notice, setNotice] = useState<string | null>(null);
  const { run, pending, error, clearError } = useAction();
  const waiting = pendingDeadlineRequest(task);
  const deadlineChanged = !waiting && !!deadline && deadline !== toDatetimeLocal(task.deadline);
  const detailsChanged = title.trim() !== task.title || description.trim() !== task.description;
  const ownersChanged = owners.length !== task.assignees.length || owners.some((id) => !task.assignees.includes(id));
  const changed = detailsChanged || ownersChanged || deadlineChanged;
  const ready = changed && title.trim().length >= 2 && owners.length > 0 && !!deadline && (!deadlineChanged || reason.trim().length >= 3);
  const reset = () => { setTitle(task.title); setDescription(task.description); setDeadline(toDatetimeLocal(task.deadline)); setReason(""); setOwners(task.assignees); setNotice(null); clearError(); };
  const save = () =>
    run(async (): Promise<ActionResult> => {
      if (detailsChanged) { const r = await updateTaskDetails(task.id, { title, description, priority: task.priority, tags: task.tags.join(", ") }); if (!r.ok) return r; }
      if (ownersChanged) { const r = await setAssignees(task.id, owners); if (!r.ok) return r; }
      if (deadlineChanged) {
        const r = await changeDeadline(task.id, deadline, reason);
        if (!r.ok) return r;
        if (!r.applied) setNotice(`Saved. The new deadline is waiting for ${r.reviewers.join(", ") || "an admin"} to approve it; until then ${fmtShortDateTime(task.deadline)} still counts.`);
      }
      return { ok: true };
    }, () => { if (direct || !deadlineChanged) setOpen(false); });
  return (
    <>
      <button type="button" onClick={() => { reset(); setOpen(true); }} className="btn btn-ghost btn-xs px-1.5" aria-label={`Edit ${task.title}`} title="Edit this dependency"><Pencil className="size-3.5" /><span className="hidden sm:inline">Edit</span></button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit dependency" wide>
        {notice ? (
          <div className="grid gap-3">
            <p className="text-sm text-ink-2 leading-relaxed">{notice}</p>
            <div className="flex justify-end"><button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>Done</button></div>
          </div>
        ) : (
          <div className="grid gap-3">
            <div><label className="label" htmlFor="edep-title">What do you need?</label><input id="edep-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="input" /></div>
            <div><label className="label" htmlFor="edep-desc">Details <span className="text-ink-3 font-normal">(optional)</span></label><textarea id="edep-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="textarea" placeholder="What exactly, and what does done look like?" /></div>
            <div className="grid sm:grid-cols-2 gap-3 items-start">
              <div className="grid gap-3">
                <div>
                  <label className="label" htmlFor="edep-deadline">Needed by</label>
                  <input id="edep-deadline" type="datetime-local" value={deadline} max={toDatetimeLocal(parent.deadline)} disabled={!!waiting} onChange={(e) => setDeadline(e.target.value)} className="input" />
                  <p className="mt-1 text-[11px] text-ink-3">{waiting ? "A deadline change is already waiting for approval, so the date is locked until it's decided." : `On or before ${fmtShortDateTime(parent.deadline)}, when the task it feeds is due.`}</p>
                </div>
                {deadlineChanged && (
                  <div>
                    <label className="label" htmlFor="edep-reason">Why is the date moving? <span className="text-critical-text">*</span></label>
                    <textarea id="edep-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="textarea" placeholder="Kept in the task's deadline history." />
                    {!direct && <p className="mt-1 text-[11px] text-ink-3">Goes to your team owner (or an admin) for approval; the current date counts until then.</p>}
                  </div>
                )}
              </div>
              <div>
                <div className="label">Who owns it</div>
                <UserCheckList users={users} selected={owners} onToggle={(id) => setOwners((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))} currentUserId={currentUserId} maxHeight="max-h-48" />
              </div>
            </div>
            <ErrorLine error={error} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={pending || !ready} onClick={save}>{pending ? "Saving…" : "Save changes"}</button>
            </div>
          </div>
        )}
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
