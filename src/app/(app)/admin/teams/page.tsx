import { requireAdmin } from "@/lib/auth";
import { listAllTasks, listTeams, listUsers } from "@/lib/queries";
import { summarizeTeam } from "@/lib/teams";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { TeamCard } from "@/components/admin/TeamCard";
import { TeamForm } from "@/components/admin/TeamForm";
import { OwnerList } from "@/components/ui/Avatar";

export default async function TeamsPage() {
  await requireAdmin();
  const now = new Date();
  const [users, tasks, teams] = await Promise.all([listUsers(), listAllTasks(), listTeams()]);
  const summaries = teams.map((t) => summarizeTeam(t, users, tasks, now));
  const inTeam = new Set(teams.flatMap((t) => t.members));
  const unassigned = users.filter((u) => !inTeam.has(u.id));

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader title="Teams" subtitle="Group people into teams. Members see their team's work on the task list and dashboard; you see how each team is performing." />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="grid gap-4">
          {summaries.length === 0 ? (
            <EmptyState title="No teams yet" body="Create the first team and add people to it." />
          ) : (
            <div className="grid md:grid-cols-2 gap-3">{summaries.map((s) => <TeamCard key={s.team.id} summary={s} />)}</div>
          )}
          {unassigned.length > 0 && (
            <div className="card p-4">
              <div className="text-xs font-semibold text-ink-2 mb-2">Not in any team yet <span className="text-ink-3 font-normal tnum">{unassigned.length}</span></div>
              <OwnerList users={unassigned} size="sm" />
            </div>
          )}
        </div>
        <TeamForm users={users} />
      </div>
    </div>
  );
}
