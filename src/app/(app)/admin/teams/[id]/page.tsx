import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, SquareKanban } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getTeam, listAllTasks, listUsers, userMap } from "@/lib/queries";
import { summarizeTeam } from "@/lib/teams";
import { taskHealth, type Level } from "@/lib/stats";
import { pct, timeAgo } from "@/lib/format";
import { PageHeader, SectionTitle, EmptyState } from "@/components/shell/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { ScoreRing, levelColor } from "@/components/ui/ScoreRing";
import { LevelPill } from "@/components/ui/Pills";
import { WeeklyCompletionsChart } from "@/components/charts/WeeklyCompletionsChart";
import { WorkloadChart } from "@/components/charts/WorkloadChart";
import { PeopleTable, type PersonRow } from "@/components/admin/PeopleTable";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TeamSettings } from "@/components/admin/TeamSettings";
import { PersonLink } from "@/components/ui/Avatar";

const VERDICT: Record<Level, string> = {
  crushing: "This team is delivering ahead of its deadlines.",
  on_track: "Deadlines are mostly being met. Keep the pace.",
  slipping: "Work is slipping past deadlines. Check in with the people flagged below.",
  lagging: "This team is behind. Overdue work needs owners and new, honest deadlines.",
  idle: "Open work, but nobody has touched it in a while.",
  no_tasks: "Nothing is assigned to this team yet.",
};

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const [team, allUsers, tasks] = await Promise.all([getTeam(id), listUsers({ includeInactive: true }), listAllTasks()]);
  if (!team) notFound();
  const now = new Date();
  const umap = userMap(allUsers);
  const titles = new Map(tasks.map((t) => [t.id, t.title]));
  const active = allUsers.filter((u) => u.active);
  const s = summarizeTeam(team, active, tasks, now);
  const { stats } = s;
  const delta = stats.completedThisWeek - stats.completedLastWeek;
  const owner = team.ownerId ? umap.get(team.ownerId) ?? null : null;

  const rows: PersonRow[] = stats.people.map((p) => {
    const u = umap.get(p.userId)!;
    return {
      id: u.id, name: u.name, color: u.color, title: u.title || (u.role === "admin" ? "Admin" : "Member"),
      level: p.level, score: p.score, ongoing: p.ongoing, overdue: p.overdue, dueSoon: p.dueSoon,
      doneOnTime: p.doneOnTime, doneLate: p.doneLate, onTimeRate: p.onTimeRate, moves30: p.deadlineMoves30, flags30: p.flags30,
      lastActivityLabel: p.lastActivityAt ? timeAgo(p.lastActivityAt, now) : "never",
      lastActivityTs: p.lastActivityAt ? new Date(p.lastActivityAt).getTime() : 0,
    };
  });
  const workload = stats.workload.map((w) => ({ name: umap.get(w.userId)?.name.split(" ")[0] ?? "?", onTrack: w.onTrack, dueSoon: w.dueSoon, overdue: w.overdue }));
  const overdueTasks = s.tasks.filter((t) => taskHealth(t, now) === "overdue").sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  return (
    <div className="grid grid-cols-1 gap-6">
      <div>
        <Link href="/admin/teams" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-4"><ArrowLeft className="size-4" />Teams</Link>
        <PageHeader
          title={<span className="inline-flex items-center gap-3"><span className="size-4 rounded-full shrink-0" style={{ backgroundColor: team.color }} aria-hidden />{team.name}</span>}
          subtitle={<>{s.members.length} {s.members.length === 1 ? "person" : "people"}{team.description ? ` · ${team.description}` : ""} · {owner ? <>Owner: <PersonLink user={owner} size="xs" nameClassName="text-sm font-medium text-ink-2" className="align-middle" /></> : "No owner yet, so members' deadline changes go to an admin"}</>}
          actions={<><Link href={`/tasks?scope=team&team=${team.id}&view=board`} className="btn btn-secondary"><SquareKanban className="size-4" />Board</Link><TeamSettings team={team} users={allUsers.filter((u) => u.active || team.members.includes(u.id))} /></>}
        />
      </div>

      <section className="card p-5 flex flex-wrap items-center gap-5" style={{ borderLeft: `4px solid ${levelColor(s.level)}` }}>
        <ScoreRing score={s.score} level={s.level} size={96} stroke={8}>
          <span className="text-2xl font-semibold tnum">{s.score ?? "–"}</span>
        </ScoreRing>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">Team ownership score</span>
            <LevelPill level={s.level} size="sm" />
          </div>
          <p className="mt-1 text-base font-medium">{VERDICT[s.level]}</p>
          <p className="mt-1 text-xs text-ink-3">Average of each member's ownership score. {s.needNudge > 0 ? `${s.needNudge} ${s.needNudge === 1 ? "person needs" : "people need"} a nudge.` : "Nobody is lagging."}</p>
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile label="Open tasks" value={stats.activeTasks} tone="accent" />
        <StatTile label="Overdue" value={stats.overdueTasks} tone="critical" emphasize={stats.overdueTasks > 0} hint={stats.overdueTasks > 0 ? "needs intervention" : "clean"} />
        <StatTile label="Due in 48h" value={stats.dueSoonTasks} tone="warn" />
        <StatTile label="Done this week" value={stats.completedThisWeek} tone="good" hint={delta === 0 ? "same as last week" : `${delta > 0 ? "+" : ""}${delta} vs last week`} />
        <StatTile label="On-time rate (30d)" value={pct(stats.onTimeRate30)} tone={stats.onTimeRate30 !== null && stats.onTimeRate30 < 0.7 ? "critical" : "good"} hint={`${stats.doneOnTime30} on time · ${stats.doneLate30} late`} />
        <StatTile label="Deadline moves (30d)" value={stats.deadlineMoves30} tone={stats.deadlineMoves30 >= 4 ? "warn" : "neutral"} hint="every one has a reason" />
      </div>

      <section>
        <SectionTitle hint="Lowest ownership score first. Click a column to sort, a name to drill in.">People in {team.name}</SectionTitle>
        {rows.length === 0 ? <EmptyState title="No members yet" body="Use the Members button above to add people to this team." /> : <PeopleTable rows={rows} />}
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <WeeklyCompletionsChart data={stats.weekly} title={`${team.name} completions by week`} hint="Last 12 weeks · on time vs late" height={260} />
        <WorkloadChart rows={workload} title="Open tasks per person" hint="Who's carrying what, and how much of it is late" />
      </div>

      <section>
        <SectionTitle hint="Every open task past its deadline, oldest first">Overdue in {team.name}</SectionTitle>
        {overdueTasks.length === 0 ? <EmptyState title="Nothing overdue" body="The whole team is inside their deadlines." /> : <div className="card overflow-hidden">{overdueTasks.map((t) => <TaskRow key={t.id} task={t} users={umap} now={now} parentTitle={t.parentId ? titles.get(t.parentId) : undefined} />)}</div>}
      </section>
    </div>
  );
}
