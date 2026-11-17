import Link from "next/link";
import { subDays } from "date-fns";
import { requireAdmin } from "@/lib/auth";
import { listAllTasks, listUsers, userMap } from "@/lib/queries";
import { fmtShortDateTime, shiftLabel, timeAgo } from "@/lib/format";
import { PageHeader, SectionTitle, EmptyState } from "@/components/shell/PageHeader";
import { Avatar, PersonLink, personHref } from "@/components/ui/Avatar";
import { pendingDeadlineRequest } from "@/lib/approvals";

export default async function DeadlineLogPage() {
  await requireAdmin();
  const now = new Date();
  const [users, tasks] = await Promise.all([listUsers({ includeInactive: true }), listAllTasks()]);
  const umap = userMap(users);
  const changes = tasks
    .flatMap((t) => t.deadlineChanges.map((d) => ({ ...d, task: t })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const cutoff = subDays(now, 30).getTime();
  const counts = new Map<string, number>();
  for (const c of changes) if (new Date(c.createdAt).getTime() >= cutoff) counts.set(c.changedBy, (counts.get(c.changedBy) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const pending = tasks.flatMap((t) => { const r = pendingDeadlineRequest(t); return r ? [{ r, task: t }] : []; });

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader title="Deadline log" subtitle="Every approved deadline change across the team, newest first. A moved deadline isn't a failure, but the pattern is the signal." />

      {pending.length > 0 && (
        <section>
          <SectionTitle hint="not applied yet; the current deadline still counts" action={<Link href="/approvals" className="text-xs font-semibold text-accent-deep hover:underline">Review →</Link>}>Waiting for approval</SectionTitle>
          <ul className="card divide-y divide-line">
            {pending.map(({ r, task }) => {
              const u = umap.get(r.requestedBy);
              return (
                <li key={r.id} className="px-4 py-3 text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link href={`/tasks/${task.id}`} className="font-medium hover:underline">{task.title}</Link>
                  <span className="text-ink-2 inline-flex items-center gap-1.5">{u ? <PersonLink user={u} size="xs" nameClassName="text-sm text-ink-2" /> : "Someone"} · {fmtShortDateTime(task.deadline)} → {fmtShortDateTime(r.newDeadline)} · {timeAgo(r.createdAt, now)}</span>
                  <span className="basis-full text-xs text-ink-3">“{r.reason}”</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle hint="Who moved deadlines in the last 30 days">By person</SectionTitle>
        {ranked.length === 0 ? <p className="text-sm text-ink-3">No deadline changes in the last 30 days.</p> : (
          <div className="flex flex-wrap gap-2">
            {ranked.map(([uid, n]) => {
              const u = umap.get(uid);
              if (!u) return null;
              return (
                <Link key={uid} href={personHref(uid)} className={`card inline-flex items-center gap-2 px-3 py-2 text-sm hover:border-line-2 ${n >= 3 ? "ring-2 ring-warn/50" : ""}`}>
                  <Avatar user={u} size="sm" />
                  <span className="font-medium">{u.name}</span>
                  <span className="pill bg-warn-soft text-warn-text">{n}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionTitle hint={`${changes.length} total`}>All changes</SectionTitle>
        {changes.length === 0 ? <EmptyState title="No deadline changes yet" /> : (
          <div className="card overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-ink-3 border-b border-line">
                  <th className="px-4 py-2.5 font-semibold">When</th>
                  <th className="px-4 py-2.5 font-semibold">Task</th>
                  <th className="px-4 py-2.5 font-semibold">Asked by</th>
                  <th className="px-4 py-2.5 font-semibold">Approved by</th>
                  <th className="px-4 py-2.5 font-semibold">From → to</th>
                  <th className="px-4 py-2.5 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((c) => {
                  const u = umap.get(c.changedBy);
                  return (
                    <tr key={c.id} className="border-b border-line last:border-b-0 align-top">
                      <td className="px-4 py-3 text-ink-2 whitespace-nowrap">{timeAgo(c.createdAt, now)}<div className="text-[11px] text-ink-3">{fmtShortDateTime(c.createdAt)}</div></td>
                      <td className="px-4 py-3"><Link href={`/tasks/${c.task.id}`} className="font-medium hover:underline">{c.task.title}</Link></td>
                      <td className="px-4 py-3">{u ? <PersonLink user={u} size="xs" nameClassName="text-sm" /> : "—"}</td>
                      <td className="px-4 py-3">{(() => { const a = c.approvedBy ? umap.get(c.approvedBy) : null; return a ? <span className="inline-flex items-center gap-1.5"><PersonLink user={a} size="xs" nameClassName="text-sm" />{c.approvedBy === c.changedBy ? <span className="text-ink-3">(direct)</span> : null}</span> : <span className="text-ink-3">—</span>; })()}</td>
                      <td className="px-4 py-3 text-ink-2 whitespace-nowrap"><div>{fmtShortDateTime(c.oldDeadline)} → {fmtShortDateTime(c.newDeadline)}</div><div className="text-[11px] text-warn-text font-semibold">{shiftLabel(c.oldDeadline, c.newDeadline)}</div></td>
                      <td className="px-4 py-3 text-ink-2 max-w-md">“{c.reason}”</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
