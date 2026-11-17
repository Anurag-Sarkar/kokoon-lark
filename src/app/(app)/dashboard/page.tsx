import Link from "next/link";
import { format } from "date-fns";
import { Hourglass, Plus } from "lucide-react";
import { canReview, pendingDeadlineRequest } from "@/lib/approvals";
import { requireUser } from "@/lib/auth";
import { listAllTasks, listTeams, listUsers, userMap } from "@/lib/queries";
import { peerIds, teamsOf } from "@/lib/teams";
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
  const [users, tasks, teams] = await Promise.all([listUsers(), listAllTasks(), listTeams()]);
  const umap = userMap(users);
  const titles = new Map(tasks.map((t) => [t.id, t.title]));
  const stats = computeUserStats(user.id, tasks, now);
  const mine = tasks.filter((t) => t.assignees.includes(user.id));

  // Members compare themselves with their team; admins see everyone.
  const myTeams = teamsOf(user.id, teams);
  const peers = user.role === "admin" || myTeams.length === 0 ? null : peerIds(user.id, teams);
  const pulseUsers = peers ? users.filter((u) => peers.has(u.id)) : users;
  const pulseHint = peers
    ? `${myTeams.map((t) => t.name).join(" · ")} · everyone in your team sees the same picture.`
    : user.role === "admin" ? "Everyone, ranked by ownership score. Click a person to drill in." : "You're not in a team yet, so this is everyone.";
  const people = pulseUsers.map((u) => ({ user: u, stats: u.id === user.id ? stats : computeUserStats(u.id, tasks, now) }));
  const toReview = tasks.filter((t) => { const r = pendingDeadlineRequest(t); return !!r && canReview(user, r.requestedBy, teams); }).length;
  const waiting = tasks.filter((t) => pendingDeadlineRequest(t)?.requestedBy === user.id).length;
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title={`${greeting}, ${user.name.split(" ")[0]}`}
        subtitle={`${format(now, "EEEE, MMMM d")} · here's an honest look at your work.`}
        actions={<Link href="/tasks/new" className="btn btn-primary"><Plus className="size-4" />New task</Link>}
      />

      {toReview > 0 && (
        <Link href="/approvals" className="card p-4 flex items-center gap-3 border-l-4 border-l-accent hover:border-line-2 transition">
          <Hourglass className="size-5 text-accent-deep shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold">{toReview} deadline {toReview === 1 ? "change needs" : "changes need"} your approval</div>
            <div className="text-xs text-ink-3">The current deadlines keep counting until you decide.</div>
          </div>
          <span className="ml-auto text-xs font-semibold text-accent-deep whitespace-nowrap">Review →</span>
        </Link>
      )}
      {waiting > 0 && (
        <Link href="/approvals" className="card p-4 flex items-center gap-3 border-l-4 border-l-warn hover:border-line-2 transition">
          <Hourglass className="size-5 text-warn-text shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold">{waiting} of your deadline {waiting === 1 ? "change is" : "changes are"} waiting for approval</div>
            <div className="text-xs text-ink-3">Until it's approved, the current deadline is the one that counts.</div>
          </div>
          <span className="ml-auto text-xs font-semibold text-accent-deep whitespace-nowrap">See status →</span>
        </Link>
      )}

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
        <TaskGroups tasks={mine} users={umap} now={now} titles={titles} />
      </section>

      <TeamPulse people={people} currentUserId={user.id} hint={pulseHint} />
    </div>
  );
}
