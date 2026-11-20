"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarClock, Check, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { addComment, addSubtask, changeDeadline, deleteTask, removeSubtask, setAssignees, setTaskStatus, toggleSubtask, updateSubtask, updateTaskDetails } from "@/lib/actions";
import { fmtShortDateTime, localInputToIso, toDatetimeLocal } from "@/lib/format";
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, type Priority, type Status, type SubtaskDTO, type TaskDTO, type UserDTO } from "@/lib/types";
import { useAction } from "@/components/useAction";
import { Modal } from "@/components/ui/Modal";
import { Avatar, personHref } from "@/components/ui/Avatar";
import { UserCheckList } from "@/components/ui/UserCheckList";

function ErrorLine({ error }: { error: string | null }) {
  return error ? <p role="alert" className="text-xs text-critical-text bg-critical-soft rounded-lg px-2.5 py-1.5">{error}</p> : null;
}

/* ---------------- Status ---------------- */

export function StatusControl({ task, canEdit }: { task: TaskDTO; canEdit: boolean }) {
  const { run, pending, error } = useAction();
  const isDone = task.status === "done";
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-line-2 bg-surface p-1">
        {STATUSES.map((s) => (
          <button key={s} type="button" disabled={!canEdit || pending} onClick={() => run(() => setTaskStatus(task.id, s))}
            className={`h-9 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition ${task.status === s ? (s === "done" ? "bg-good text-white" : "bg-ink text-white") : "text-ink-2 hover:bg-surface-2 disabled:hover:bg-transparent"}`}>
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      {canEdit && !isDone && (
        <button type="button" disabled={pending} onClick={() => run(() => setTaskStatus(task.id, "done"))} className="btn btn-primary w-full" style={{ background: "var(--color-good)" }}>
          <Check className="size-4" />Mark done
        </button>
      )}
      <ErrorLine error={error} />
    </div>
  );
}

/* ---------------- Deadline ---------------- */

/**
 * Admins (`direct`) move the deadline on the spot. Everyone else sends a request to `reviewerLabel`,
 * and the current deadline keeps counting until it's approved.
 */
export function DeadlineChanger({ task, canEdit, direct, reviewerLabel, minDeadline, maxDeadline }: { task: TaskDTO; canEdit: boolean; direct: boolean; reviewerLabel: string; /** latest open dependency, so the task can't be pulled in before it */ minDeadline?: string; /** the parent task's deadline, for a dependency */ maxDeadline?: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(toDatetimeLocal(task.deadline));
  const [reason, setReason] = useState("");
  const { run, pending, error, clearError } = useAction();
  if (!canEdit) return null;
  return (
    <>
      <button type="button" onClick={() => { setValue(toDatetimeLocal(task.deadline)); setReason(""); clearError(); setOpen(true); }} className="btn btn-secondary btn-sm w-full">
        <CalendarClock className="size-3.5" />{direct ? "Change deadline" : "Ask to change deadline"}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={direct ? "Change the deadline" : "Ask to change the deadline"}>
        <div className="grid gap-3">
          <p className="text-xs text-ink-2 leading-relaxed">
            {direct
              ? "You're an admin, so this applies straight away. It's logged with your name and reason for everyone to see."
              : `This goes to ${reviewerLabel} for approval. Until it's approved, the current deadline is the one you're measured against. The reason is visible to the team.`}
          </p>
          <div>
            <label className="label" htmlFor="newDeadline">New deadline</label>
            <input id="newDeadline" type="datetime-local" value={value} min={minDeadline ? toDatetimeLocal(minDeadline) : undefined} max={maxDeadline ? toDatetimeLocal(maxDeadline) : undefined} onChange={(e) => setValue(e.target.value)} className="input" />
            {maxDeadline && <p className="mt-1 text-[11px] text-ink-3">No later than the task it feeds: {toDatetimeLocal(maxDeadline).replace("T", " ")}.</p>}
            {minDeadline && <p className="mt-1 text-[11px] text-ink-3">No earlier than its latest open dependency: {toDatetimeLocal(minDeadline).replace("T", " ")}.</p>}
          </div>
          <div>
            <label className="label" htmlFor="reason">Reason <span className="text-critical-text">*</span></label>
            <textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="textarea" placeholder="e.g. Blocked on vendor API keys, expected Tuesday." />
          </div>
          <ErrorLine error={error} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={pending || reason.trim().length < 5} onClick={() => run(() => changeDeadline(task.id, localInputToIso(value), reason), () => setOpen(false))}>
              {pending ? "Saving…" : direct ? "Move deadline" : "Send for approval"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* ---------------- Assignees ---------------- */

export function AssigneeEditor({ task, users, canEdit, currentUserId }: { task: TaskDTO; users: UserDTO[]; canEdit: boolean; currentUserId?: string }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string[]>(task.assignees);
  const { run, pending, error, clearError } = useAction();
  if (!canEdit) return null;
  return (
    <>
      <button type="button" onClick={() => { setSel(task.assignees); clearError(); setOpen(true); }} className="btn btn-ghost btn-xs"><Users className="size-3.5" />Edit</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Who owns this?">
        <UserCheckList users={users} selected={sel} onToggle={(id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))} currentUserId={currentUserId} maxHeight="max-h-80" />
        <div className="mt-3 grid gap-2">
          <ErrorLine error={error} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={pending || sel.length === 0} onClick={() => run(() => setAssignees(task.id, sel), () => setOpen(false))}>Save owners</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* ---------------- Subtasks ---------------- */

/**
 * A subtask's planned date, as a quiet note. It is a plan for pacing the work, never a deadline:
 * nothing is scored or flagged on it. A plan that has passed on an open step shows in amber as a nudge.
 */
function PlanNote({ s, now }: { s: SubtaskDTO; now: string }) {
  if (!s.plannedFor) return null;
  const slipped = !s.isDone && new Date(s.plannedFor).getTime() < new Date(now).getTime();
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] whitespace-nowrap ${slipped ? "text-warn-text font-semibold" : "text-ink-3"}`} title={slipped ? "Planned for earlier than now; only the task deadline counts" : "Planned for; only the task deadline counts"}>
      <CalendarClock className="size-3" aria-hidden />{slipped ? "planned for " : "by "}{fmtShortDateTime(s.plannedFor)}
    </span>
  );
}

export function SubtaskList({ task, subtasks, users, canEdit, now }: { task: TaskDTO; subtasks: SubtaskDTO[]; users: UserDTO[]; canEdit: boolean; /** ISO, from the server, so past/future reads the same on both ends */ now: string }) {
  const [title, setTitle] = useState("");
  const [plannedFor, setPlannedFor] = useState("");
  const [editing, setEditing] = useState<{ id: string; title: string; plannedFor: string } | null>(null);
  const { run, pending, error } = useAction();
  const done = subtasks.filter((s) => s.isDone).length;
  const pctv = subtasks.length ? Math.round((done / subtasks.length) * 100) : 0;
  const byId = new Map(users.map((u) => [u.id, u]));
  const maxPlan = toDatetimeLocal(task.deadline);
  return (
    <div className="grid gap-3">
      {subtasks.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-line overflow-hidden"><div className="h-full rounded-full bg-good transition-all" style={{ width: `${pctv}%` }} /></div>
          <span className="text-xs text-ink-2 tnum font-semibold">{done}/{subtasks.length}</span>
        </div>
      )}
      <ul className="grid gap-1">
        {subtasks.map((s) => {
          const who = s.completedBy ? byId.get(s.completedBy) : null;
          if (editing?.id === s.id) {
            return (
              <li key={s.id} className="rounded-lg px-2 py-1.5 bg-surface-2">
                <form className="grid grid-cols-[minmax(0,1fr)_auto_auto] sm:grid-cols-[minmax(0,1fr)_12.5rem_auto_auto] gap-2 items-center" onSubmit={(e) => { e.preventDefault(); if (!editing.title.trim()) return; run(() => updateSubtask(task.id, s.id, { title: editing.title, plannedFor: localInputToIso(editing.plannedFor) }), () => setEditing(null)); }}>
                  <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); }} className="input h-9" aria-label="Subtask title" maxLength={200} autoFocus />
                  <input type="datetime-local" value={editing.plannedFor} max={maxPlan} onChange={(e) => setEditing({ ...editing, plannedFor: e.target.value })} onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); }} className="input h-9 order-last col-span-3 sm:order-none sm:col-span-1" aria-label="Planned for (optional)" title="Plan to have this step done by (optional)" />
                  <button type="submit" className="btn btn-secondary btn-sm" disabled={pending || !editing.title.trim()}><Check className="size-3.5" />Save</button>
                  <button type="button" className="btn btn-ghost btn-sm px-2" onClick={() => setEditing(null)} aria-label="Cancel"><X className="size-4" /></button>
                </form>
              </li>
            );
          }
          return (
            <li key={s.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
              <input type="checkbox" checked={s.isDone} disabled={!canEdit || pending} onChange={(e) => run(() => toggleSubtask(task.id, s.id, e.target.checked))} className="accent-ink size-4" aria-label={s.title} />
              <span className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className={`text-sm ${s.isDone ? "line-through text-ink-3" : ""}`}>{s.title}</span>
                <PlanNote s={s} now={now} />
              </span>
              {who && <Link href={personHref(who.id)} className="shrink-0" title={`Done by ${who.name}`}><Avatar user={who} size="xs" /></Link>}
              {canEdit && (
                <span className="inline-flex items-center sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <button type="button" onClick={() => setEditing({ id: s.id, title: s.title, plannedFor: s.plannedFor ? toDatetimeLocal(s.plannedFor) : "" })} className="btn btn-ghost btn-xs px-1" aria-label="Edit subtask"><Pencil className="size-3.5" /></button>
                  <button type="button" onClick={() => run(() => removeSubtask(task.id, s.id))} className="btn btn-ghost btn-xs px-1" aria-label="Remove subtask"><Trash2 className="size-3.5" /></button>
                </span>
              )}
            </li>
          );
        })}
        {subtasks.length === 0 && <li className="text-xs text-ink-3 px-2">No subtasks yet. Break the work down so progress is visible.</li>}
      </ul>
      {canEdit && (
        <form className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_12.5rem_auto] gap-2 items-center" onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return; run(() => addSubtask(task.id, title, localInputToIso(plannedFor)), () => { setTitle(""); setPlannedFor(""); }); }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input h-9" placeholder="Add a subtask and press Enter" maxLength={200} />
          <input type="datetime-local" value={plannedFor} max={maxPlan} onChange={(e) => setPlannedFor(e.target.value)} className="input h-9 order-last col-span-2 sm:order-none sm:col-span-1" aria-label="Planned for (optional)" title="Plan to have this step done by (optional)" />
          <button type="submit" className="btn btn-secondary btn-sm" disabled={pending || !title.trim()}><Plus className="size-3.5" />Add</button>
        </form>
      )}
      {canEdit && <p className="text-[11px] text-ink-3 px-2">A date on a step is a plan for pacing the work, not a deadline. Only the task's deadline counts.</p>}
      <ErrorLine error={error} />
    </div>
  );
}

/* ---------------- Comments ---------------- */

export function CommentBox({ taskId }: { taskId: string }) {
  const [body, setBody] = useState("");
  const { run, pending, error } = useAction();
  return (
    <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); run(() => addComment(taskId, body), () => setBody("")); }}>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="textarea" placeholder="Share an update, a blocker, or a question…" />
      <ErrorLine error={error} />
      <div className="flex justify-end"><button type="submit" className="btn btn-primary btn-sm" disabled={pending || !body.trim()}>{pending ? "Posting…" : "Post comment"}</button></div>
    </form>
  );
}

/* ---------------- Details editor ---------------- */

export function TaskEditor({ task, canEdit, children }: { task: TaskDTO; canEdit: boolean; children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [tags, setTags] = useState(task.tags.join(", "));
  const { run, pending, error } = useAction();

  if (!editing) {
    return (
      <div className="relative">
        {children}
        {canEdit && <button type="button" onClick={() => { setTitle(task.title); setDescription(task.description); setPriority(task.priority); setTags(task.tags.join(", ")); setEditing(true); }} className="btn btn-ghost btn-sm absolute right-0 top-0"><Pencil className="size-3.5" />Edit</button>}
      </div>
    );
  }
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); run(() => updateTaskDetails(task.id, { title, description, priority, tags }), () => setEditing(false)); }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className="input text-lg font-semibold" required maxLength={200} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="textarea" placeholder="Description" />
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="label">Priority</label><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="select">{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></div>
        <div><label className="label">Tags</label><input value={tags} onChange={(e) => setTags(e.target.value)} className="input" placeholder="comma, separated" /></div>
      </div>
      <ErrorLine error={error} />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}><X className="size-3.5" />Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  );
}

/* ---------------- Delete ---------------- */

export function DeleteTaskButton({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const { run, pending, error } = useAction();
  const router = useRouter();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost btn-sm text-critical-text"><Trash2 className="size-3.5" />Delete task</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Delete this task?">
        <p className="text-sm text-ink-2">This removes the task, its subtasks, comments and history for everyone. It cannot be undone.</p>
        <ErrorLine error={error} />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Keep it</button>
          <button type="button" className="btn btn-danger" disabled={pending} onClick={() => run(() => deleteTask(taskId), () => router.push("/tasks"))}>{pending ? "Deleting…" : "Delete"}</button>
        </div>
      </Modal>
    </>
  );
}

export function StatusLabelInline({ status }: { status: Status }) {
  return <>{STATUS_LABEL[status]}</>;
}
