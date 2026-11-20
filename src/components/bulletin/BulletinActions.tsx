"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addDays, setHours, setMinutes } from "date-fns";
import { Hand, Pencil, Pin, Trash2 } from "lucide-react";
import { createBulletinPost, pickUpBulletinPost, removeBulletinPost, updateBulletinPost, type BulletinInput } from "@/lib/actions";
import { fmtShortDateTime, localInputToIso, toDatetimeLocal } from "@/lib/format";
import { PRIORITIES, PRIORITY_LABEL, type BulletinPostDTO, type Priority } from "@/lib/types";
import { useAction } from "@/components/useAction";
import { Modal } from "@/components/ui/Modal";

function ErrorLine({ error }: { error: string | null }) {
  return error ? <p role="alert" className="text-xs text-critical-text bg-critical-soft rounded-lg px-2.5 py-1.5">{error}</p> : null;
}

/** What the post dialogs edit. Dates are datetime-local strings here and ISO on the way to the server. */
type Draft = { title: string; description: string; priority: Priority; tags: string; wantedBy: string };
const emptyDraft = (): Draft => ({ title: "", description: "", priority: "medium", tags: "", wantedBy: "" });
const draftOf = (p: BulletinPostDTO): Draft => ({ title: p.title, description: p.description, priority: p.priority, tags: p.tags.join(", "), wantedBy: p.wantedBy ? toDatetimeLocal(p.wantedBy) : "" });
const toInput = (d: Draft): BulletinInput => ({ ...d, wantedBy: d.wantedBy ? localInputToIso(d.wantedBy) : "" });

/** The fields of a post, shared by "Post work" and "Edit". */
function PostFields({ d, set, idPrefix }: { d: Draft; set: (patch: Partial<Draft>) => void; idPrefix: string }) {
  return (
    <>
      <div>
        <label className="label" htmlFor={`${idPrefix}-title`}>What needs doing?</label>
        <input id={`${idPrefix}-title`} value={d.title} onChange={(e) => set({ title: e.target.value })} maxLength={200} className="input" placeholder="e.g. Write the release notes for 2.4" autoFocus />
      </div>
      <div>
        <label className="label" htmlFor={`${idPrefix}-desc`}>Details <span className="text-ink-3 font-normal">(optional)</span></label>
        <textarea id={`${idPrefix}-desc`} rows={4} value={d.description} onChange={(e) => set({ description: e.target.value })} maxLength={4000} className="textarea" placeholder="What exactly, where to start, and what done looks like." />
      </div>
      <div className="grid sm:grid-cols-2 gap-3 items-start">
        <div>
          <label className="label" htmlFor={`${idPrefix}-priority`}>Suggested priority</label>
          <select id={`${idPrefix}-priority`} value={d.priority} onChange={(e) => set({ priority: e.target.value as Priority })} className="select">
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`${idPrefix}-wanted`}>Ideally by <span className="text-ink-3 font-normal">(optional)</span></label>
          <input id={`${idPrefix}-wanted`} type="datetime-local" value={d.wantedBy} onChange={(e) => set({ wantedBy: e.target.value })} className="input" />
          <p className="mt-1 text-[11px] text-ink-3">A hint for whoever picks it up. Not a deadline: they set their own.</p>
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`${idPrefix}-tags`}>Tags <span className="text-ink-3 font-normal">(optional, comma separated)</span></label>
        <input id={`${idPrefix}-tags`} value={d.tags} onChange={(e) => set({ tags: e.target.value })} className="input" placeholder="docs, release" />
      </div>
    </>
  );
}

/** "Post work": puts a note on the board. No owner, no deadline. */
export function PostButton({ className = "btn btn-primary" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<Draft>(emptyDraft);
  const { run, pending, error, clearError } = useAction();
  const set = (patch: Partial<Draft>) => setD((s) => ({ ...s, ...patch }));
  const ready = d.title.trim().length >= 2;
  return (
    <>
      <button type="button" className={className} onClick={() => { setD(emptyDraft()); clearError(); setOpen(true); }}><Pin className="size-4" />Post work</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Post to the bulletin board" wide>
        <div className="grid gap-3">
          <p className="text-xs text-ink-2 leading-relaxed">Work that needs doing but has no owner yet. It goes on the board with no deadline; whoever picks it up makes it their task and sets their own. Everyone with push on gets a nudge.</p>
          <PostFields d={d} set={set} idPrefix="post" />
          <ErrorLine error={error} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={pending || !ready} onClick={() => run(() => createBulletinPost(toInput(d)), () => setOpen(false))}>{pending ? "Posting…" : "Post it"}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/** Edit or remove an open post. Only the poster or an admin sees this. */
export function EditPostButton({ post }: { post: BulletinPostDTO }) {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<Draft>(() => draftOf(post));
  const { run, pending, error, clearError } = useAction();
  const set = (patch: Partial<Draft>) => setD((s) => ({ ...s, ...patch }));
  const ready = d.title.trim().length >= 2;
  return (
    <>
      <button type="button" onClick={() => { setD(draftOf(post)); clearError(); setOpen(true); }} className="btn btn-ghost btn-xs px-1.5 shrink-0" aria-label={`Edit ${post.title}`} title="Edit this post"><Pencil className="size-3.5" /><span className="hidden sm:inline">Edit</span></button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit post" wide>
        <div className="grid gap-3">
          <PostFields d={d} set={set} idPrefix={`edit-${post.id}`} />
          <ErrorLine error={error} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" className="btn btn-danger btn-sm" disabled={pending} onClick={() => run(() => removeBulletinPost(post.id), () => setOpen(false))} title="Take it off the board"><Trash2 className="size-3.5" />Remove from board</button>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={pending || !ready} onClick={() => run(() => updateBulletinPost(post.id, toInput(d)), () => setOpen(false))}>{pending ? "Saving…" : "Save changes"}</button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

/** "Pick this up": the post becomes a task of this person's own, with the deadline and priority they set here. */
export function PickUpButton({ post, posterName }: { post: BulletinPostDTO; posterName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<Priority>(post.priority);
  const { run, pending, error, clearError } = useAction();
  const start = () => {
    // Start from the poster's hint when it is still ahead; otherwise three days out at 5 pm, like a new task.
    const wanted = post.wantedBy ? new Date(post.wantedBy) : null;
    const def = wanted && wanted.getTime() > Date.now() ? wanted : setMinutes(setHours(addDays(new Date(), 3), 17), 0);
    setDeadline(toDatetimeLocal(def.toISOString()));
    setPriority(post.priority);
    clearError();
    setOpen(true);
  };
  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={start}><Hand className="size-3.5" />Pick this up</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Pick this up?">
        <div className="grid gap-3">
          <div className="rounded-lg bg-surface-2 px-3 py-2.5 grid gap-1">
            <div className="text-sm font-semibold leading-snug">{post.title}</div>
            {post.description && <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto scrollbar-thin">{post.description}</p>}
            <div className="text-[11px] text-ink-3">Posted by {posterName}{post.wantedBy ? ` · ideally by ${fmtShortDateTime(post.wantedBy)}` : ""}</div>
          </div>
          <p className="text-xs text-ink-2 leading-relaxed">It becomes a task of your own with the deadline you set here, and counts in your ownership score like any other task. {posterName === "you" ? "" : `${posterName} is told.`}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor={`pick-deadline-${post.id}`}>Your deadline</label>
              <input id={`pick-deadline-${post.id}`} type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor={`pick-priority-${post.id}`}>Priority</label>
              <select id={`pick-priority-${post.id}`} value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="select">
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </div>
          </div>
          <ErrorLine error={error} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={pending || !deadline} onClick={() => run(() => pickUpBulletinPost(post.id, { deadline: localInputToIso(deadline), priority }), (r) => router.push(`/tasks/${r.id}`))}>{pending ? "Picking up…" : "Pick it up"}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
