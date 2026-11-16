"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { createTask, type FormState } from "@/lib/actions";
import { PRIORITIES, PRIORITY_LABEL, type UserDTO } from "@/lib/types";
import { UserCheckList } from "@/components/ui/UserCheckList";

export function NewTaskForm({ users, defaultDeadline, currentUserId }: { users: UserDTO[]; defaultDeadline: string; currentUserId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createTask, undefined);
  const [subtasks, setSubtasks] = useState<string[]>([""]);
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <form action={action} className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
      <div className="card p-5 grid gap-4">
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" required maxLength={200} className="input text-base font-medium" placeholder="What needs to get done?" autoFocus />
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={5} className="textarea" placeholder="Context, links, definition of done…" />
        </div>
        <div>
          <label className="label">Subtasks</label>
          <div className="grid gap-2">
            {subtasks.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input name="subtasks" value={s} onChange={(e) => setSubtasks((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} className="input" placeholder={`Step ${i + 1}`} />
                <button type="button" onClick={() => setSubtasks((arr) => arr.filter((_, j) => j !== i))} className="btn btn-ghost btn-sm px-2" aria-label="Remove subtask"><X className="size-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => setSubtasks((arr) => [...arr, ""])} className="btn btn-secondary btn-sm justify-self-start"><Plus className="size-3.5" />Add subtask</button>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="card p-5 grid gap-4">
          <div>
            <label className="label" htmlFor="deadline">Deadline</label>
            <input id="deadline" name="deadline" type="datetime-local" required defaultValue={defaultDeadline} className="input" />
            <p className="mt-1 text-[11px] text-ink-3">Changing it later requires a reason, visible to everyone.</p>
          </div>
          <div>
            <label className="label" htmlFor="priority">Priority</label>
            <select id="priority" name="priority" defaultValue="medium" className="select">
              {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tags">Tags</label>
            <input id="tags" name="tags" className="input" placeholder="design, launch, q4" />
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-2"><span className="label mb-0">Owners</span></div>
          <UserCheckList users={users} selected={selected} onToggle={toggle} name="assignees" currentUserId={currentUserId} />
        </div>

        {state?.error && <p role="alert" className="text-sm text-critical-text bg-critical-soft rounded-lg px-3 py-2">{state.error}</p>}
        <button type="submit" className="btn btn-primary h-10" disabled={pending}>{pending ? "Creating…" : "Create task"}</button>
      </div>
    </form>
  );
}
