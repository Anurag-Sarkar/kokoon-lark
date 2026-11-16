import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getUser, listAllTasks, listUsers, userMap } from "@/lib/queries";
import { computeUserStats } from "@/lib/stats";
import { fmtShortDateTime, shiftLabel } from "@/lib/format";
import { PageHeader, SectionTitle, EmptyState } from "@/components/shell/PageHeader";
import { PulseCard } from "@/components/dashboard/PulseCard";
import { AttentionList } from "@/components/dashboard/AttentionList";
import { WeeklyCompletionsChart } from "@/components/charts/WeeklyCompletionsChart";
import { StatTile } from "@/components/ui/StatTile";
import { TaskGroups } from "@/components/tasks/TaskGroups";
import { Avatar } from "@/components/ui/Avatar";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const [person, users, tasks] = await Promise.all([getUser(id), listUsers({ includeInactive: true }), listAllTasks()]);
  if (!person) notFound();
  const now = new Date();
  const umap = userMap(users);
  const stats = computeUserStats(person.id, tasks, now);
  const theirs = tasks.filter((t) => t.assignees.includes(person.id));
  const moves = tasks.flatMap((t) => t.deadlineChanges.filter((d) => d.changedBy === person.id).map((d) => ({ ...d, task: t }))).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="grid grid-cols-1 gap-6">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-4"><ArrowLeft className="size-4" />Team overview</Link>
        <PageHeader
          title={<span className="inline-flex items-center gap-3"><Avatar user={person} size="lg" />{person.name}</span>}
          subtitle={`${person.title || (person.role === "admin" ? "Admin" : "Member")} · ${person.email}${person.active ? "" : " · deactivated"}`}
        />
      </div>

      <PulseCard user={person} stats={stats} isSelf={false} now={now} />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile label="Open" value={stats.ongoing} tone="accent" hint={`${stats.onTrack} on track`} />
        <StatTile label="Overdue" value={stats.overdue} tone="critical" emphasize={stats.overdue > 0} />
        <StatTile label="Due in 48h" value={stats.dueSoon} tone="warn" />
        <StatTile label="Done on time" value={stats.doneOnTime} tone="good" hint={`${stats.doneOnTime30} this month`} />
        <StatTile label="Done late" value={stats.doneLate} tone="critical" hint={`${stats.doneLate30} this month`} />
        <StatTile label="Flagged" value={stats.flagsTotal} tone="critical" emphasize={stats.flags30 > 0} hint={stats.flagsTotal > 0 ? `${stats.flags30} this month · marked done but wasn't` : "never"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <WeeklyCompletionsChart data={stats.weekly} title={`${person.name.split(" ")[0]}'s completions by week`} hint="Last 8 weeks · on time vs late" />
        <AttentionList tasks={theirs} users={umap} now={now} title="Needs their attention" />
      </div>

      <section>
        <SectionTitle hint={`Every deadline ${person.name.split(" ")[0]} has moved, with the reason given`}>Deadline changes <span className="text-ink-3 font-normal tnum">{moves.length}</span></SectionTitle>
        {moves.length === 0 ? <EmptyState title="No deadline changes" body="They have never moved a deadline." /> : (
          <div className="card divide-y divide-line">
            {moves.map((m) => (
              <div key={m.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link href={`/tasks/${m.task.id}`} className="font-medium hover:underline">{m.task.title}</Link>
                  <span className="text-xs text-ink-3">{shiftLabel(m.oldDeadline, m.newDeadline)} · {fmtShortDateTime(m.createdAt)}</span>
                </div>
                <div className="text-xs text-ink-3 mt-0.5">{fmtShortDateTime(m.oldDeadline)} → {fmtShortDateTime(m.newDeadline)}</div>
                <div className="mt-1.5 inline-block rounded-md bg-warn-soft text-warn-text text-xs px-2 py-1">“{m.reason}”</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle hint="Everything assigned to them">Tasks</SectionTitle>
        <TaskGroups tasks={theirs} users={umap} now={now} />
      </section>
    </div>
  );
}
