import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, History, MessageSquare, ListChecks } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTask, listUsers, userMap } from "@/lib/queries";
import { taskHealth } from "@/lib/stats";
import { deadlineDistance, fmtDateTime, fmtShortDateTime, latenessLabel, shiftLabel, timeAgo } from "@/lib/format";
import { PRIORITY_LABEL, type UserDTO } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { HealthPill, PriorityMark, StatusPill, Tag } from "@/components/ui/Pills";
import { AssigneeEditor, CommentBox, DeadlineChanger, DeleteTaskButton, StatusControl, SubtaskList, TaskEditor } from "./parts";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [task, users] = await Promise.all([getTask(id), listUsers({ includeInactive: true })]);
  if (!task) notFound();
  const now = new Date();
  const umap = userMap(users);
  const canEdit = user.role === "admin" || task.createdBy === user.id || task.assignees.includes(user.id);
  const canDelete = user.role === "admin" || task.createdBy === user.id;
  const h = taskHealth(task, now);
  const dist = deadlineDistance(task.deadline, now);
  const owners = task.assignees.map((a) => umap.get(a)).filter((u): u is UserDTO => !!u);
  const creator = umap.get(task.createdBy);
  const activeUsers = users.filter((u) => u.active);
  const timeline = [...task.activity].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const isDone = task.status === "done";
  const moved = task.deadlineChanges.length > 0;

  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/tasks" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"><ArrowLeft className="size-4" />All tasks</Link>
        {canDelete && <DeleteTaskButton taskId={task.id} />}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        {/* Main column */}
        <div className="grid gap-5 min-w-0">
          <section className="card p-5 sm:p-6">
            <TaskEditor task={task} canEdit={canEdit}>
              <div className="pr-20">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <PriorityMark priority={task.priority} withLabel />
                  <StatusPill status={task.status} />
                  {isDone ? <HealthPill health={h} /> : h !== "on_track" && <HealthPill health={h} label={dist.label} />}
                  {moved && <span className="pill bg-warn-soft text-warn-text"><CalendarClock className="size-3.5" />Deadline moved {task.deadlineChanges.length}×</span>}
                </div>
                <h1 className="text-2xl font-semibold tracking-tight leading-tight">{task.title}</h1>
                {task.description ? <p className="mt-3 text-sm text-ink-2 leading-relaxed whitespace-pre-wrap">{task.description}</p> : <p className="mt-3 text-sm text-ink-3 italic">No description.</p>}
                {task.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{task.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>}
              </div>
            </TaskEditor>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold mb-3"><ListChecks className="size-4 text-ink-3" />Subtasks</h2>
            <SubtaskList task={task} subtasks={task.subtasks} users={users} canEdit={canEdit} />
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold mb-3"><MessageSquare className="size-4 text-ink-3" />Comments <span className="text-ink-3 font-normal tnum">{task.comments.length}</span></h2>
            <ul className="grid gap-4 mb-4">
              {task.comments.map((c) => {
                const u = umap.get(c.userId);
                return (
                  <li key={c.id} className="flex gap-3">
                    {u && <Avatar user={u} size="md" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2"><span className="text-sm font-semibold">{u?.name ?? "Unknown"}</span><span className="text-[11px] text-ink-3">{timeAgo(c.createdAt, now)}</span></div>
                      <p className="mt-0.5 text-sm text-ink-2 whitespace-pre-wrap leading-relaxed">{c.body}</p>
                    </div>
                  </li>
                );
              })}
              {task.comments.length === 0 && <li className="text-xs text-ink-3">No comments yet.</li>}
            </ul>
            <CommentBox taskId={task.id} />
          </section>
        </div>

        {/* Side column */}
        <aside className="grid gap-4 lg:sticky lg:top-6">
          <section className="card p-4 grid gap-3">
            <div className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Status</div>
            <StatusControl task={task} canEdit={canEdit} />
            {isDone && task.completedAt && (
              <p className="text-xs text-ink-2">Completed {fmtDateTime(task.completedAt, now)}{task.completedBy && umap.get(task.completedBy) ? ` by ${umap.get(task.completedBy)!.name}` : ""} · <span className={h === "done_late" ? "text-critical-text font-semibold" : "text-good-text font-semibold"}>{latenessLabel(task.deadline, task.completedAt)}</span></p>
            )}
          </section>

          <section className={`card p-4 grid gap-3 border-l-4 ${h === "overdue" || h === "done_late" ? "border-l-critical" : h === "due_soon" ? "border-l-warn" : h === "done_on_time" ? "border-l-good" : "border-l-accent"}`}>
            <div className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Deadline</div>
            <div>
              <div className="text-lg font-semibold tracking-tight">{fmtDateTime(task.deadline, now)}</div>
              {!isDone && <div className={`text-xs font-semibold mt-0.5 ${dist.tone === "overdue" ? "text-critical-text" : dist.tone === "soon" ? "text-warn-text" : "text-ink-3"}`}>{dist.label}</div>}
              {moved && <div className="text-[11px] text-ink-3 mt-1">Originally {fmtShortDateTime(task.originalDeadline)}</div>}
            </div>
            <DeadlineChanger task={task} canEdit={canEdit} />
            {moved && (
              <ol className="grid gap-2 border-t border-line pt-3">
                {[...task.deadlineChanges].reverse().map((d) => {
                  const who = umap.get(d.changedBy);
                  return (
                    <li key={d.id} className="text-xs">
                      <div className="flex items-center gap-1.5 text-ink-2">{who && <Avatar user={who} size="xs" />}<span className="font-semibold">{who?.name ?? "Someone"}</span><span className="text-ink-3">{shiftLabel(d.oldDeadline, d.newDeadline)} · {timeAgo(d.createdAt, now)}</span></div>
                      <div className="mt-0.5 text-ink-3">{fmtShortDateTime(d.oldDeadline)} → {fmtShortDateTime(d.newDeadline)}</div>
                      <div className="mt-1 rounded-md bg-warn-soft text-warn-text px-2 py-1">“{d.reason}”</div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="card p-4 grid gap-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Owners</div>
              <AssigneeEditor task={task} users={activeUsers} canEdit={canEdit} />
            </div>
            <ul className="grid gap-2">
              {owners.map((u) => (
                <li key={u.id} className="flex items-center gap-2.5">
                  <Avatar user={u} size="sm" />
                  <span className="min-w-0"><span className="block text-sm font-medium truncate">{u.name}{u.id === user.id ? " (you)" : ""}</span><span className="block text-[11px] text-ink-3 truncate">{u.title || (u.role === "admin" ? "Admin" : "Member")}</span></span>
                </li>
              ))}
            </ul>
            <dl className="grid grid-cols-2 gap-2 text-xs border-t border-line pt-3">
              <div><dt className="text-ink-3">Priority</dt><dd className="font-semibold">{PRIORITY_LABEL[task.priority]}</dd></div>
              <div><dt className="text-ink-3">Created</dt><dd className="font-semibold">{timeAgo(task.createdAt, now)}{creator ? ` by ${creator.name.split(" ")[0]}` : ""}</dd></div>
            </dl>
          </section>

          <section className="card p-4">
            <h2 className="flex items-center gap-2 text-xs font-semibold text-ink-3 uppercase tracking-wider mb-3"><History className="size-3.5" />Activity</h2>
            <ol className="grid gap-3 max-h-[420px] overflow-auto scrollbar-thin pr-1">
              {timeline.map((a) => {
                const u = umap.get(a.userId);
                const tone = a.type === "deadline" ? "bg-warn" : a.type === "completed" ? "bg-good" : a.type === "reopened" ? "bg-critical" : "bg-line-2";
                return (
                  <li key={a.id} className="relative pl-5 text-xs">
                    <span className={`absolute left-0 top-1.5 size-2.5 rounded-full ${tone}`} aria-hidden />
                    <div className="text-ink-2 leading-relaxed"><span className="font-semibold text-ink">{u?.name.split(" ")[0] ?? "Someone"}</span> {a.detail}</div>
                    <div className="text-ink-3 mt-0.5">{fmtDateTime(a.createdAt, now)}</div>
                  </li>
                );
              })}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
