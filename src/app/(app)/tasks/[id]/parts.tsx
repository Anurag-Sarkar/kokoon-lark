"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarClock, Check, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { addComment, addSubtask, changeDeadline, deleteTask, removeSubtask, setAssignees, setTaskStatus, toggleSubtask, updateTaskDetails } from "@/lib/actions";
import { toDatetimeLocal } from "@/lib/format";
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, type Priority, type Status, type SubtaskDTO, type TaskDTO, type UserDTO } from "@/lib/types";
import { useAction } from "@/components/useAction";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";

function ErrorLine({ error }: { error: string | null }) {
  return error ? <p role="alert" className="text-xs text-critical-text bg-critical-soft rounded-lg px-2.5 py-1.5">{error}</p> : null;
}

/* ---------------- Status ---------------- */

export function StatusControl({ task, canEdit }: { task: TaskDTO; canEdit: boolean }) {
  const { run, pending, error } = useAction();
  const isDone = task.status === "done";
  return (
    <div className="grid gap-2">
      <div className="inline-flex w-full rounded-[10px] border border-line-2 bg-surface p-0.5">
        {STATUSES.map((s) => (
          <button key={s} type="button" disabled={!canEdit || pending} onClick={() => run(() => setTaskStatus(task.id, s))}
            className={`flex-1 h-8 rounded-lg text-xs font-semibold transition ${task.status === s ? (s === "done" ? "bg-good text-white" : "bg-ink text-white") : "text-ink-2 hover:bg-surface-2 disabled:hover:bg-transparent"}`}>
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

export function DeadlineChanger({ task, canEdit }: { task: TaskDTO; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(toDatetimeLocal(task.deadline));
  const [reason, setReason] = useState("");
  const { run, pending, error, clearError } = useAction();
  if (!canEdit) return null;
  return (
    <>
      <button type="button" onClick={() => { setValue(toDatetimeLocal(task.deadline)); setReason(""); clearError(); setOpen(true); }} className="btn btn-secondary btn-sm w-full">
        <CalendarClock className="size-3.5" />Change deadline
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Change the deadline">
        <div className="grid gap-3">
          <p className="text-xs text-ink-2 leading-relaxed">Deadline changes are logged with your name and reason, and count against your ownership score. Make it a good reason.</p>
          <div>
            <label className="label" htmlFor="newDeadline">New deadline</label>
            <input id="newDeadline" type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="reason">Reason <span className="text-critical-text">*</span></label>
            <textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="textarea" placeholder="e.g. Blocked on vendor API keys, expected Tuesday." />
          </div>
          <ErrorLine error={error} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={pending || reason.trim().length < 5} onClick={() => run(() => changeDeadline(task.id, value, reason), () => setOpen(false))}>
              {pending ? "Saving…" : "Move deadline"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* ---------------- Assignees ---------------- */

export function AssigneeEditor({ task, users, canEdit }: { task: TaskDTO; users: UserDTO[]; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string[]>(task.assignees);
  const { run, pending, error, clearError } = useAction();
  if (!canEdit) return null;
  return (
    <>
      <button type="button" onClick={() => { setSel(task.assignees); clearError(); setOpen(true); }} className="btn btn-ghost btn-xs"><Users className="size-3.5" />Edit</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Who owns this?">
        <ul className="grid gap-1 max-h-80 overflow-auto scrollbar-thin">
          {users.map((u) => {
            const on = sel.includes(u.id);
            return (
              <li key={u.id}>
                <label className={`flex items-center gap-3 rounded-lg px-2 py-1.5 cursor-pointer ${on ? "bg-accent-soft" : "hover:bg-surface-2"}`}>
                  <input type="checkbox" checked={on} onChange={() => setSel((s) => (on ? s.filter((x) => x !== u.id) : [...s, u.id]))} className="accent-ink size-4" />
                  <Avatar user={u} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{u.name}</span>
                    <span className="block text-[11px] text-ink-3 truncate">{u.title || (u.role === "admin" ? "Admin" : "Member")}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
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

export function SubtaskList({ task, subtasks, users, canEdit }: { task: TaskDTO; subtasks: SubtaskDTO[]; users: UserDTO[]; canEdit: boolean }) {
  const [title, setTitle] = useState("");
  const { run, pending, error } = useAction();
  const done = subtasks.filter((s) => s.isDone).length;
  const pctv = subtasks.length ? Math.round((done / subtasks.length) * 100) : 0;
  const byId = new Map(users.map((u) => [u.id, u]));
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
          return (
            <li key={s.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
              <input type="checkbox" checked={s.isDone} disabled={!canEdit || pending} onChange={(e) => run(() => toggleSubtask(task.id, s.id, e.target.checked))} className="accent-ink size-4" aria-label={s.title} />
              <span className={`flex-1 text-sm ${s.isDone ? "line-through text-ink-3" : ""}`}>{s.title}</span>
              {who && <Avatar user={who} size="xs" />}
              {canEdit && <button type="button" onClick={() => run(() => removeSubtask(task.id, s.id))} className="btn btn-ghost btn-xs px-1 opacity-0 group-hover:opacity-100" aria-label="Remove subtask"><Trash2 className="size-3.5" /></button>}
            </li>
          );
        })}
        {subtasks.length === 0 && <li className="text-xs text-ink-3 px-2">No subtasks yet. Break the work down so progress is visible.</li>}
      </ul>
      {canEdit && (
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return; run(() => addSubtask(task.id, title), () => setTitle("")); }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input h-9" placeholder="Add a subtask and press Enter" />
          <button type="submit" className="btn btn-secondary btn-sm" disabled={pending || !title.trim()}><Plus className="size-3.5" />Add</button>
        </form>
      )}
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
