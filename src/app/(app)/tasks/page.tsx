import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listAllTasks, listTeams, listUsers, userMap } from "@/lib/queries";
import { taskHealth } from "@/lib/stats";
import { deadlineDistance, fmtDateTime, latenessLabel } from "@/lib/format";
import { subtaskProgress } from "@/lib/taskViews";
import { inPeriod, periodTitle, resolvePeriod } from "@/lib/period";
import { peerIds, teamTasks, teamsOf } from "@/lib/teams";
import { PRIORITIES, STATUSES, type Priority, type Status, type TaskDTO, type TeamDTO, type UserDTO } from "@/lib/types";
import { EmptyState, PageHeader } from "@/components/shell/PageHeader";
import { TaskFilters, type Scope } from "@/components/tasks/TaskFilters";
import { TaskGroups } from "@/components/tasks/TaskGroups";
import { KanbanBoard, type KanbanCard } from "@/components/tasks/KanbanBoard";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] ?? "" : v ?? "");

export default async function TasksPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const now = new Date();
  const [users, all, teams] = await Promise.all([listUsers(), listAllTasks(), listTeams()]);
  const umap = userMap(users);
  const isAdmin = user.role === "admin";

  // Members never see "everyone": their widest view is their own team(s).
  const myTeams: TeamDTO[] = isAdmin ? teams : teamsOf(user.id, teams);
  const requested = one(sp.scope);
  const scope: Scope = requested === "all" ? (isAdmin ? "all" : "team") : requested === "team" ? "team" : requested === "mine" ? "mine" : isAdmin ? "all" : "mine";
  const requestedTeam = one(sp.team);
  const selectedTeam = scope === "team" ? (myTeams.find((t) => t.id === requestedTeam) ?? (isAdmin ? myTeams[0] ?? null : null)) : null;
  const teamMembers = scope === "team" ? (selectedTeam ? new Set(selectedTeam.members) : isAdmin ? new Set<string>() : peerIds(user.id, teams)) : null;

  const view = one(sp.view) === "board" ? "board" : "list";
  const q = one(sp.q).trim().toLowerCase();
  const status = one(sp.status);
  const priority = one(sp.priority);
  const assignee = one(sp.assignee);

  // Completed tasks are hidden unless asked for, and then limited to one period.
  // Only admins may move the window to earlier days or weeks.
  const showDone = one(sp.done) === "1" || status === "done";
  const period = resolvePeriod(isAdmin ? one(sp.range) : "", isAdmin ? one(sp.at) : "", now);

  let tasks: TaskDTO[] =
    scope === "mine" ? all.filter((t) => t.assignees.includes(user.id) || t.createdBy === user.id)
    : scope === "team" ? teamTasks(teamMembers ?? [], all)
    : all;
  if (q) tasks = tasks.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some((x) => x.includes(q)));
  if (status === "open") tasks = tasks.filter((t) => t.status !== "done");
  else if (STATUSES.includes(status as Status)) tasks = tasks.filter((t) => t.status === status);
  if (PRIORITIES.includes(priority as Priority)) tasks = tasks.filter((t) => t.priority === priority);
  if (assignee) tasks = tasks.filter((t) => t.assignees.includes(assignee));
  tasks = tasks.filter((t) => t.status !== "done" || (showDone && inPeriod(t.completedAt ?? t.updatedAt, period)));

  const open = tasks.filter((t) => t.status !== "done").length;
  const overdue = tasks.filter((t) => taskHealth(t, now) === "overdue").length;
  const doneCount = tasks.length - open;

  const canEdit = (t: TaskDTO) => isAdmin || t.createdBy === user.id || t.assignees.includes(user.id);
  const cards: KanbanCard[] = tasks.map((t) => {
    const h = taskHealth(t, now);
    const prog = subtaskProgress(t);
    const owners = t.assignees.map((id) => umap.get(id)).filter((u): u is UserDTO => !!u).map((u) => ({ name: u.name, color: u.color }));
    const dist = deadlineDistance(t.deadline, now);
    const done = t.status === "done";
    return {
      id: t.id, title: t.title, priority: t.priority, status: t.status,
      deadlineLabel: done && t.completedAt ? `Done · ${latenessLabel(t.deadline, t.completedAt)}` : `${dist.label} · ${fmtDateTime(t.deadline, now)}`,
      deadlineTone: done ? (h === "done_late" ? "done_late" : "done_on_time") : dist.tone,
      owners, subDone: prog.done, subTotal: prog.total, canEdit: canEdit(t),
    };
  });

  const columns: Status[] = showDone ? STATUSES : STATUSES.filter((s) => s !== "done");
  const scopeLabel = scope === "mine" ? "My tasks" : scope === "all" ? "Everyone" : selectedTeam ? selectedTeam.name : myTeams.length > 1 ? "All my teams" : myTeams[0]?.name ?? "My team";
  const noTeam = scope === "team" && myTeams.length === 0;

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={`${scopeLabel} · ${open} open${overdue > 0 ? ` · ${overdue} overdue` : ""}${showDone ? ` · ${doneCount} completed (${period.label.toLowerCase()})` : ""}`}
        actions={<Link href="/tasks/new" className="btn btn-primary"><Plus className="size-4" />New task</Link>}
      />
      <TaskFilters users={users} teams={myTeams} isAdmin={isAdmin} scope={scope} teamId={selectedTeam?.id ?? ""} period={period} showDone={showDone} />
      {noTeam ? (
        <EmptyState title={isAdmin ? "No teams yet" : "You're not in a team yet"} body={isAdmin ? "Create a team under Manage → Teams to see team boards." : "Ask your admin to add you to a team to see your peers' work here."} />
      ) : view === "board" ? (
        <KanbanBoard key={tasks.map((t) => t.id + t.status).join("|") + columns.length} cards={cards} columns={columns} doneLabel={period.label} />
      ) : (
        <TaskGroups tasks={tasks} users={umap} now={now} collapseDone={false} doneHint={`${periodTitle(period)} · most recent first`} />
      )}
    </div>
  );
}
