"use client";

import { localInputToIso } from "@/lib/format";

import { useActionState, useState } from "react";
import { GitBranchPlus, Plus, X } from "lucide-react";
import { createTask, type FormState } from "@/lib/actions";
import { PRIORITIES, PRIORITY_LABEL, type Priority, type UserDTO } from "@/lib/types";
import { UserCheckList } from "@/components/ui/UserCheckList";

interface SubtaskRow { title: string; plannedFor: string }
interface DependencyRow { key: number; title: string; description: string; deadline: string; owners: string[] }

/** Every field is controlled, so a server-side error never wipes what was typed, and the button only enables once the essentials are in. */
export function NewTaskForm({ users, defaultDeadline, currentUserId }: { users: UserDTO[]; defaultDeadline: string; currentUserId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createTask, undefined);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [priority, setPriority] = useState<Priority>("medium");
  const [tags, setTags] = useState("");
  const [subtasks, setSubtasks] = useState<SubtaskRow[]>([{ title: "", plannedFor: "" }]);
  const [deps, setDeps] = useState<DependencyRow[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const setSub = (i: number, patch: Partial<SubtaskRow>) => setSubtasks((arr) => arr.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setDep = (key: number, patch: Partial<DependencyRow>) => setDeps((arr) => arr.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const addDep = () => { setDeps((arr) => [...arr, { key: nextKey, title: "", description: "", deadline, owners: [] }]); setNextKey((k) => k + 1); };

  const depIncomplete = deps.some((d) => d.title.trim().length < 2 || !d.deadline || d.owners.length === 0);
  const missing: string[] = [];
  if (title.trim().length < 2) missing.push("a title");
  if (!deadline) missing.push("a deadline");
  if (selected.length === 0) missing.push("at least one owner");
  if (depIncomplete) missing.push("a title, a date and an owner for each dependency");
  const ready = missing.length === 0;

  // Dependencies travel as one JSON field; dates are converted on this device so they mean what was typed.
  const depsJson = JSON.stringify(
    deps.map((d) => ({ title: d.title, description: d.description, deadline: localInputToIso(d.deadline), assigneeIds: d.owners }))
  );

  return (
    <form action={action} className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
      <div className="grid gap-4">
        <div className="card p-5 grid gap-4">
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input id="title" name="title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className="input text-base font-medium" placeholder="What needs to get done?" autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} className="textarea" placeholder="Context, links, definition of done…" />
          </div>
          <div>
            <label className="label">Subtasks</label>
            <p className="-mt-0.5 mb-2 text-[11px] text-ink-3">Break the work into steps. A date on a step is a plan for when it should be done, not a deadline: only the task's deadline counts.</p>
            <div className="grid gap-2">
              {subtasks.map((s, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_13rem_auto] gap-2 items-center">
                  <input name="subtasks" value={s.title} onChange={(e) => setSub(i, { title: e.target.value })} className="input" placeholder={`Step ${i + 1}`} maxLength={200} />
                  <input type="datetime-local" value={s.plannedFor} max={deadline || undefined} onChange={(e) => setSub(i, { plannedFor: e.target.value })} className="input order-3 col-span-2 sm:order-none sm:col-span-1" aria-label={`Plan for step ${i + 1} (optional)`} title="Plan to have this step done by (optional)" />
                  <input type="hidden" name="subtaskPlans" value={localInputToIso(s.plannedFor)} />
                  <button type="button" onClick={() => setSubtasks((arr) => arr.filter((_, j) => j !== i))} className="btn btn-ghost btn-sm px-2 order-2 sm:order-none" aria-label="Remove subtask"><X className="size-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => setSubtasks((arr) => [...arr, { title: "", plannedFor: "" }])} className="btn btn-secondary btn-sm justify-self-start"><Plus className="size-3.5" />Add subtask</button>
            </div>
          </div>
        </div>

        <div className="card p-5 grid gap-3">
          <div>
            <div className="label">Dependencies</div>
            <p className="-mt-0.5 text-[11px] text-ink-3">Work you need from someone else before this task can finish. Each one becomes a task of its own for them, due on or before this deadline, and they're told as soon as the task is created.</p>
          </div>
          {deps.map((d, i) => (
            <div key={d.key} className="rounded-xl border border-line bg-surface-2 p-3 grid gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink-2">Dependency {i + 1}</span>
                <button type="button" onClick={() => setDeps((arr) => arr.filter((x) => x.key !== d.key))} className="btn btn-ghost btn-xs px-1.5" aria-label={`Remove dependency ${i + 1}`}><X className="size-3.5" />Remove</button>
              </div>
              <div>
                <label className="label" htmlFor={`dep-title-${d.key}`}>What do you need?</label>
                <input id={`dep-title-${d.key}`} value={d.title} onChange={(e) => setDep(d.key, { title: e.target.value })} maxLength={200} className="input" placeholder="e.g. Final copy for the pricing page" />
              </div>
              <div>
                <label className="label" htmlFor={`dep-desc-${d.key}`}>Details <span className="text-ink-3 font-normal">(optional)</span></label>
                <textarea id={`dep-desc-${d.key}`} rows={2} value={d.description} onChange={(e) => setDep(d.key, { description: e.target.value })} className="textarea" placeholder="What exactly, and what does done look like?" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3 items-start">
                <div>
                  <label className="label" htmlFor={`dep-deadline-${d.key}`}>Needed by</label>
                  <input id={`dep-deadline-${d.key}`} type="datetime-local" value={d.deadline} max={deadline || undefined} onChange={(e) => setDep(d.key, { deadline: e.target.value })} className="input" />
                  <p className="mt-1 text-[11px] text-ink-3">On or before this task's deadline.</p>
                </div>
                <div>
                  <div className="label">Who owns it</div>
                  <UserCheckList users={users} selected={d.owners} onToggle={(id) => setDep(d.key, { owners: d.owners.includes(id) ? d.owners.filter((x) => x !== id) : [...d.owners, id] })} currentUserId={currentUserId} maxHeight="max-h-40" />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addDep} className="btn btn-secondary btn-sm justify-self-start" disabled={!deadline}><GitBranchPlus className="size-3.5" />Add dependency</button>
          <input type="hidden" name="dependencies" value={depsJson} />
        </div>
      </div>

      <div className="grid gap-4">
        <div className="card p-5 grid gap-4">
          <div>
            <label className="label" htmlFor="deadline">Deadline</label>
            <input id="deadline" type="datetime-local" required value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input" />
            <input type="hidden" name="deadline" value={localInputToIso(deadline)} />
            <p className="mt-1 text-[11px] text-ink-3">Changing it later requires a reason, visible to everyone.</p>
          </div>
          <div>
            <label className="label" htmlFor="priority">Priority</label>
            <select id="priority" name="priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="select">
              {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="tags">Tags</label>
            <input id="tags" name="tags" value={tags} onChange={(e) => setTags(e.target.value)} className="input" placeholder="design, launch, q4" />
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-2 flex items-center justify-between"><span className="label mb-0">Owners</span>{selected.length === 0 && <span className="text-[11px] text-warn-text font-semibold">Pick at least one</span>}</div>
          <UserCheckList users={users} selected={selected} onToggle={toggle} name="assignees" currentUserId={currentUserId} />
        </div>

        {state?.error && <p role="alert" className="text-sm text-critical-text bg-critical-soft rounded-lg px-3 py-2">{state.error}</p>}
        <button type="submit" className="btn btn-primary h-10" disabled={pending || !ready}>{pending ? "Creating…" : "Create task"}</button>
        {!ready && <p className="text-[11px] text-ink-3 text-center -mt-2">Add {missing.join(", ").replace(/, ([^,]*)$/, " and $1")} to create the task.</p>}
      </div>
    </form>
  );
}
