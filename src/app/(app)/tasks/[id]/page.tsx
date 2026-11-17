import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, GitBranch, History, Hourglass, MessageSquare, ListChecks, ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTask, listChildTasks, listTeams, listUsers, userMap } from "@/lib/queries";
import { activeFlag, canFlag } from "@/lib/integrity";
import { AddDependencyButton, ClearFlagButton, EditDependencyButton, FlagButton } from "@/components/tasks/Dependencies";
import { Avatar, OwnerList, PersonLink, personHref } from "@/components/ui/Avatar";
import { LinkSpinner } from "@/components/ui/LinkPending";
import { taskHealth } from "@/lib/stats";
import { canReview, changesApplyDirectly, pendingDeadlineRequest, reviewerLabel, reviewersFor } from "@/lib/approvals";
import { ReviewButtons } from "@/components/approvals/ReviewButtons";
import { deadlineDistance, fmtDateTime, fmtShortDateTime, latenessLabel, shiftLabel, timeAgo } from "@/lib/format";
import { PRIORITY_LABEL, type UserDTO } from "@/lib/types";
import { HealthPill, PriorityMark, StatusPill, Tag } from "@/components/ui/Pills";
import { AssigneeEditor, CommentBox, DeadlineChanger, DeleteTaskButton, StatusControl, SubtaskList, TaskEditor } from "./parts";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [task, users, teams] = await Promise.all([getTask(id), listUsers({ includeInactive: true }), listTeams()]);
  if (!task) notFound();
  const [children, parent] = await Promise.all([listChildTasks(task.id), task.parentId ? getTask(task.parentId) : Promise.resolve(null)]);
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
  const pending = pendingDeadlineRequest(task);
  const direct = changesApplyDirectly(user);
  const myReviewers = direct ? "" : reviewerLabel(reviewersFor(user.id, users, teams));
  const requester = pending ? umap.get(pending.requestedBy) ?? null : null;
  const canDecide = pending ? canReview(user, pending.requestedBy, teams) : false;
  const canWithdraw = pending ? pending.requestedBy === user.id || user.role === "admin" : false;
  const waitingOn = pending ? reviewerLabel(reviewersFor(pending.requestedBy, users, teams)) : "";
  const flag = activeFlag(task);
  const flagger = flag ? umap.get(flag.by) ?? null : null;
  const mayFlag = canFlag(user, task, teams);
  const openChildren = children.filter((c) => c.status !== "done").length;
  const latestOpenChild = children.filter((c) => c.status !== "done").map((c) => c.deadline).sort().at(-1);

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
                  {pending && <span className="pill bg-accent-soft text-accent-deep"><Hourglass className="size-3.5" />Deadline change pending</span>}
                  {flag && <span className="pill bg-critical-soft text-critical-text"><ShieldAlert className="size-3.5" />Flagged: marked done but wasn't</span>}
                  {parent && <Link href={`/tasks/${parent.id}`} className="pill bg-violet-soft text-violet hover:underline" title="This task exists because another task is waiting on it"><GitBranch className="size-3.5" />Dependency · feeds {parent.title}</Link>}
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
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><GitBranch className="size-4 text-ink-3" />Dependencies {children.length > 0 && <span className="text-ink-3 font-normal tnum">{children.length - openChildren}/{children.length} done</span>}</h2>
              {canEdit && !isDone && <AddDependencyButton parent={task} users={activeUsers} currentUserId={user.id} />}
            </div>
            {children.length === 0 ? (
              <p className="text-xs text-ink-3">Nothing from other people is needed for this task. If it depends on someone else's work, add it here: they get it as a task of their own, with its own deadline.</p>
            ) : (
              <ul className="grid gap-1">
                {children.map((c) => {
                  const ch = taskHealth(c, now);
                  const cd = deadlineDistance(c.deadline, now);
                  const cOwners = c.assignees.map((a) => umap.get(a)).filter((u): u is UserDTO => !!u);
                  const cFlag = activeFlag(c);
                  const cPending = pendingDeadlineRequest(c);
                  const cEditable = user.role === "admin" || c.createdBy === user.id || c.assignees.includes(user.id);
                  return (
                    <li key={c.id} className="row-link relative grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 border border-line hover:border-line-2">
                      <Link href={`/tasks/${c.id}`} className="absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:outline-accent" aria-label={c.title}>
                        <LinkSpinner className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-surface" />
                      </Link>
                        <span className="min-w-0">
                          <span className={`block text-sm font-medium truncate ${c.status === "done" ? "text-ink-2" : ""}`}>{c.title}</span>
                          <span className={`block text-[11px] ${ch === "overdue" ? "text-critical-text font-semibold" : ch === "due_soon" ? "text-warn-text font-semibold" : "text-ink-3"}`}>
                            {c.status === "done" && c.completedAt ? `Done · ${latenessLabel(c.deadline, c.completedAt)}` : `${fmtDateTime(c.deadline, now)} · ${cd.label}`}
                            {cFlag ? " · flagged" : ""}
                            {cPending ? " · change pending approval" : ""}
                          </span>
                        </span>
                        <span className="hidden sm:flex justify-end max-w-[220px]"><OwnerList users={cOwners} size="xs" className="justify-end" /></span>
                        <span className="justify-self-end inline-flex items-center gap-1.5">
                          {c.status === "done" ? <HealthPill health={ch} /> : ch === "on_track" ? <StatusPill status={c.status} /> : <HealthPill health={ch} label={cd.label} />}
                          {cEditable && c.status !== "done" && <span className="relative z-10"><EditDependencyButton task={c} parent={task} users={activeUsers} currentUserId={user.id} direct={direct} /></span>}
                        </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold mb-3"><MessageSquare className="size-4 text-ink-3" />Comments <span className="text-ink-3 font-normal tnum">{task.comments.length}</span></h2>
            <ul className="grid gap-4 mb-4">
              {task.comments.map((c) => {
                const u = umap.get(c.userId);
                return (
                  <li key={c.id} className="flex gap-3">
                    {u && <Link href={personHref(u.id)} className="shrink-0" title={`${u.name}'s page`}><Avatar user={u} size="md" /></Link>}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">{u ? <Link href={personHref(u.id)} className="text-sm font-semibold hover:underline">{u.name}</Link> : <span className="text-sm font-semibold">Unknown</span>}<span className="text-[11px] text-ink-3">{timeAgo(c.createdAt, now)}</span></div>
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
            {!isDone && openChildren > 0 && <p className="text-[11px] text-warn-text font-semibold">{openChildren} {openChildren === 1 ? "dependency is" : "dependencies are"} still open.</p>}
            {flag && (
              <div className="rounded-xl border border-critical/40 bg-critical-soft p-3 grid gap-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-critical-text"><ShieldAlert className="size-3.5" />Flagged by {flagger ? <Link href={personHref(flagger.id)} className="hover:underline">{flagger.name}</Link> : "a reviewer"} · {timeAgo(flag.createdAt, now)}</div>
                <div className="text-ink-2">Marked done, but the work wasn't done. Reopened, and it counts against the owners' score until cleared.</div>
                <div className="rounded-md bg-surface px-2 py-1 text-ink-2">“{flag.reason}”</div>
                {mayFlag && <div className="pt-1"><ClearFlagButton taskId={task.id} flagId={flag.id} /></div>}
              </div>
            )}
            {isDone && !flag && mayFlag && <FlagButton taskId={task.id} />}
            {isDone && task.completedAt && (
              <p className="text-xs text-ink-2">Completed {fmtDateTime(task.completedAt, now)}{(() => { const by = task.completedBy ? umap.get(task.completedBy) : null; return by ? <> by <Link href={personHref(by.id)} className="font-medium hover:underline">{by.name}</Link></> : null; })()} · <span className={h === "done_late" ? "text-critical-text font-semibold" : "text-good-text font-semibold"}>{latenessLabel(task.deadline, task.completedAt)}</span></p>
            )}
          </section>

          <section className={`card p-4 grid gap-3 border-l-4 ${h === "overdue" || h === "done_late" ? "border-l-critical" : h === "due_soon" ? "border-l-warn" : h === "done_on_time" ? "border-l-good" : "border-l-accent"}`}>
            <div className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Deadline</div>
            <div>
              <div className="text-lg font-semibold tracking-tight">{fmtDateTime(task.deadline, now)}</div>
              {!isDone && <div className={`text-xs font-semibold mt-0.5 ${dist.tone === "overdue" ? "text-critical-text" : dist.tone === "soon" ? "text-warn-text" : "text-ink-3"}`}>{dist.label}</div>}
              {moved && <div className="text-[11px] text-ink-3 mt-1">Originally {fmtShortDateTime(task.originalDeadline)}</div>}
            </div>
            {pending ? (
              <div className="rounded-xl border border-accent/40 bg-accent-soft p-3 grid gap-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-accent-deep"><Hourglass className="size-3.5" />Waiting for approval</div>
                <div className="text-ink-2">{requester ? <Link href={personHref(requester.id)} className="font-semibold text-ink hover:underline">{requester.name}</Link> : <span className="font-semibold text-ink">Someone</span>} asked {timeAgo(pending.createdAt, now)} · {shiftLabel(task.deadline, pending.newDeadline)}</div>
                <div className="font-semibold text-ink">{fmtShortDateTime(task.deadline)} → {fmtShortDateTime(pending.newDeadline)}</div>
                <div className="rounded-md bg-surface px-2 py-1 text-ink-2">“{pending.reason}”</div>
                <div className="text-ink-3">The current deadline counts until {canDecide ? "you decide" : `${waitingOn} decides`}.</div>
                <ReviewButtons taskId={task.id} requestId={pending.id} canReview={canDecide} canWithdraw={canWithdraw} />
              </div>
            ) : (
              <DeadlineChanger task={task} canEdit={canEdit} direct={direct} reviewerLabel={myReviewers} minDeadline={latestOpenChild} maxDeadline={parent?.deadline} />
            )}
            {moved && (
              <ol className="grid gap-2 border-t border-line pt-3">
                {[...task.deadlineChanges].reverse().map((d) => {
                  const who = umap.get(d.changedBy);
                  return (
                    <li key={d.id} className="text-xs">
                      <div className="flex items-center gap-1.5 text-ink-2">{who ? <PersonLink user={who} size="xs" nameClassName="text-xs font-semibold text-ink-2" /> : <span className="font-semibold">Someone</span>}<span className="text-ink-3">{shiftLabel(d.oldDeadline, d.newDeadline)} · {timeAgo(d.createdAt, now)}{d.approvedBy && d.approvedBy !== d.changedBy ? ` · approved by ${umap.get(d.approvedBy)?.name.split(" ")[0] ?? "admin"}` : ""}</span></div>
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
              <AssigneeEditor task={task} users={activeUsers} canEdit={canEdit} currentUserId={user.id} />
            </div>
            <ul className="grid gap-2">
              {owners.map((u) => (
                <li key={u.id}>
                  <Link href={personHref(u.id)} className="flex items-center gap-2.5 rounded-lg -mx-1.5 px-1.5 py-1 hover:bg-surface-2 transition" title={`${u.name}'s page`}>
                    <Avatar user={u} size="sm" />
                    <span className="min-w-0"><span className="block text-sm font-medium truncate">{u.name}{u.id === user.id ? " (you)" : ""}</span><span className="block text-[11px] text-ink-3 truncate">{u.title || (u.role === "admin" ? "Admin" : "Member")}</span></span>
                    <LinkSpinner className="ml-auto" />
                  </Link>
                </li>
              ))}
            </ul>
            <dl className="grid grid-cols-2 gap-2 text-xs border-t border-line pt-3">
              <div><dt className="text-ink-3">Priority</dt><dd className="font-semibold">{PRIORITY_LABEL[task.priority]}</dd></div>
              <div><dt className="text-ink-3">Created</dt><dd className="font-semibold">{timeAgo(task.createdAt, now)}{creator ? <> by <Link href={personHref(creator.id)} className="hover:underline">{creator.name.split(" ")[0]}</Link></> : ""}</dd></div>
            </dl>
          </section>

          <section className="card p-4">
            <h2 className="flex items-center gap-2 text-xs font-semibold text-ink-3 uppercase tracking-wider mb-3"><History className="size-3.5" />Activity</h2>
            <ol className="grid gap-3 max-h-[420px] overflow-auto scrollbar-thin pr-1">
              {timeline.map((a) => {
                const u = umap.get(a.userId);
                const tone = a.type === "deadline_approved" || a.type === "flag_cleared" ? "bg-good" : a.type === "deadline_rejected" || a.type === "flagged" ? "bg-critical" : a.type.startsWith("deadline") ? "bg-warn" : a.type === "completed" ? "bg-good" : a.type === "reopened" ? "bg-critical" : "bg-line-2";
                return (
                  <li key={a.id} className="relative pl-5 text-xs">
                    <span className={`absolute left-0 top-1.5 size-2.5 rounded-full ${tone}`} aria-hidden />
                    <div className="text-ink-2 leading-relaxed">{u ? <Link href={personHref(u.id)} className="font-semibold text-ink hover:underline">{u.name.split(" ")[0]}</Link> : <span className="font-semibold text-ink">Someone</span>} {a.detail}</div>
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
