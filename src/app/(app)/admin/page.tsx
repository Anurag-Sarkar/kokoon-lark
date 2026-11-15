import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listAllTasks, listUsers, userMap } from "@/lib/queries";
import { computeTeamStats, taskHealth } from "@/lib/stats";
import { pct, timeAgo } from "@/lib/format";
import { PageHeader, SectionTitle } from "@/components/shell/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { WeeklyCompletionsChart } from "@/components/charts/WeeklyCompletionsChart";
import { WorkloadChart } from "@/components/charts/WorkloadChart";
import { PeopleTable, type PersonRow } from "@/components/admin/PeopleTable";
import { TaskRow } from "@/components/tasks/TaskRow";
import { EmptyState } from "@/components/shell/PageHeader";

export default async function AdminPage() {
  await requireAdmin();
  const now = new Date();
  const [users, tasks] = await Promise.all([listUsers(), listAllTasks()]);
  const umap = userMap(users);
  const team = computeTeamStats(users, tasks, now);
  const delta = team.completedThisWeek - team.completedLastWeek;

  const rows: PersonRow[] = team.people.map((p) => {
    const u = umap.get(p.userId)!;
    return {
      id: u.id, name: u.name, color: u.color, title: u.title || (u.role === "admin" ? "Admin" : "Member"),
      level: p.level, score: p.score, ongoing: p.ongoing, overdue: p.overdue, dueSoon: p.dueSoon,
      doneOnTime: p.doneOnTime, doneLate: p.doneLate, onTimeRate: p.onTimeRate, moves30: p.deadlineMoves30,
      lastActivityLabel: p.lastActivityAt ? timeAgo(p.lastActivityAt, now) : "never",
      lastActivityTs: p.lastActivityAt ? new Date(p.lastActivityAt).getTime() : 0,
    };
  });
  const workload = team.workload.map((w) => ({ name: umap.get(w.userId)?.name.split(" ")[0] ?? "?", onTrack: w.onTrack, dueSoon: w.dueSoon, overdue: w.overdue }));
  const overdueTasks = tasks.filter((t) => taskHealth(t, now) === "overdue").sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  const lagging = team.people.filter((p) => p.level === "lagging" || p.level === "idle").length;

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader title="Team overview" subtitle={`${users.length} people · ${team.activeTasks} open tasks${lagging > 0 ? ` · ${lagging} ${lagging === 1 ? "person needs" : "people need"} a nudge` : " · everyone is moving"}`} actions={<Link href="/admin/deadline-changes" className="btn btn-secondary">Deadline log</Link>} />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile label="Open tasks" value={team.activeTasks} tone="accent" />
        <StatTile label="Overdue" value={team.overdueTasks} tone="critical" emphasize={team.overdueTasks > 0} hint={team.overdueTasks > 0 ? "needs intervention" : "clean"} />
        <StatTile label="Due in 48h" value={team.dueSoonTasks} tone="warn" />
        <StatTile label="Done this week" value={team.completedThisWeek} tone="good" hint={delta === 0 ? "same as last week" : `${delta > 0 ? "+" : ""}${delta} vs last week`} />
        <StatTile label="On-time rate (30d)" value={pct(team.onTimeRate30)} tone={team.onTimeRate30 !== null && team.onTimeRate30 < 0.7 ? "critical" : "good"} hint={`${team.doneOnTime30} on time · ${team.doneLate30} late`} />
        <StatTile label="Deadline moves (30d)" value={team.deadlineMoves30} tone={team.deadlineMoves30 >= 4 ? "warn" : "neutral"} hint="every one has a reason" />
      </div>

      <section>
        <SectionTitle hint="Lowest ownership score first. Click a column to sort, a name to drill in.">People</SectionTitle>
        <PeopleTable rows={rows} />
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <WeeklyCompletionsChart data={team.weekly} title="Team completions by week" hint="Last 12 weeks · on time vs late" height={260} />
        <WorkloadChart rows={workload} title="Open tasks per person" hint="Who's carrying what, and how much of it is late" />
      </div>

      <section>
        <SectionTitle hint="Every open task past its deadline, oldest first">Overdue across the team</SectionTitle>
        {overdueTasks.length === 0 ? <EmptyState title="Nothing overdue" body="The whole team is inside their deadlines." /> : <div className="card overflow-hidden">{overdueTasks.map((t) => <TaskRow key={t.id} task={t} users={umap} now={now} />)}</div>}
      </section>
    </div>
  );
}
