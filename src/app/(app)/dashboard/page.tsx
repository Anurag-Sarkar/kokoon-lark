import Link from "next/link";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listAllTasks, listUsers, userMap } from "@/lib/queries";
import { computeUserStats } from "@/lib/stats";
import { PageHeader, SectionTitle } from "@/components/shell/PageHeader";
import { PulseCard } from "@/components/dashboard/PulseCard";
import { TeamPulse } from "@/components/dashboard/TeamPulse";
import { AttentionList } from "@/components/dashboard/AttentionList";
import { WeeklyCompletionsChart } from "@/components/charts/WeeklyCompletionsChart";
import { StatTile } from "@/components/ui/StatTile";
import { TaskGroups } from "@/components/tasks/TaskGroups";

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const [users, tasks] = await Promise.all([listUsers(), listAllTasks()]);
  const umap = userMap(users);
  const stats = computeUserStats(user.id, tasks, now);
  const mine = tasks.filter((t) => t.assignees.includes(user.id));
  const people = users.map((u) => ({ user: u, stats: u.id === user.id ? stats : computeUserStats(u.id, tasks, now) }));
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title={`${greeting}, ${user.name.split(" ")[0]}`}
        subtitle={`${format(now, "EEEE, MMMM d")} · here's an honest look at your work.`}
        actions={<Link href="/tasks/new" className="btn btn-primary"><Plus className="size-4" />New task</Link>}
      />

      <PulseCard user={user} stats={stats} isSelf now={now} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile label="Open" value={stats.ongoing} tone="accent" hint={`${stats.onTrack} on track`} />
        <StatTile label="Overdue" value={stats.overdue} tone="critical" hint={stats.overdue > 0 ? "fix these first" : "nothing late"} emphasize={stats.overdue > 0} />
        <StatTile label="Due in 48h" value={stats.dueSoon} tone="warn" hint="coming up fast" />
        <StatTile label="Done on time" value={stats.doneOnTime} tone="good" hint={`${stats.doneOnTime30} this month`} />
        <StatTile label="Done late" value={stats.doneLate} tone="critical" hint={stats.avgLateHours === null ? "never, nice" : `avg ${stats.avgLateHours >= 24 ? `${(stats.avgLateHours / 24).toFixed(1)}d` : `${Math.round(stats.avgLateHours)}h`} late`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <WeeklyCompletionsChart data={stats.weekly} title="Your completions by week" hint="Last 8 weeks · on time vs late" />
        <AttentionList tasks={mine} users={umap} now={now} />
      </div>

      <section>
        <SectionTitle hint="Everything assigned to you" action={<Link href="/tasks?scope=mine" className="text-xs font-semibold text-accent-deep hover:underline">Open task list →</Link>}>Your tasks</SectionTitle>
        <TaskGroups tasks={mine} users={umap} now={now} />
      </section>

      <TeamPulse people={people} currentUserId={user.id} linkToAdmin={user.role === "admin"} />
    </div>
  );
}
