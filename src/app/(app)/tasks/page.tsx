import Link from "next/link";
import { Suspense, cache } from "react";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listAllTasks, listTeams, listUsers, userMap } from "@/lib/queries";
import { taskHealth } from "@/lib/stats";
import { deadlineDistance, fmtDateTime, latenessLabel } from "@/lib/format";
import { subtaskProgress } from "@/lib/taskViews";
import { inPeriod, periodTitle, resolvePeriod, type Period } from "@/lib/period";
import { peerIds, teamTasks, teamsOf } from "@/lib/teams";
import { PRIORITIES, STATUSES, type Priority, type Status, type TaskDTO, type TeamDTO, type UserDTO } from "@/lib/types";
import { EmptyState, PageHeader } from "@/components/shell/PageHeader";
import { TaskFilters, type Scope } from "@/components/tasks/TaskFilters";
import { TaskGroups } from "@/components/tasks/TaskGroups";
import { KanbanBoard, type KanbanCard } from "@/components/tasks/KanbanBoard";
import { pendingDeadlineRequest } from "@/lib/approvals";
import { activeFlag } from "@/lib/integrity";
import { Skeleton, TasksBoardSkeleton, TasksListSkeleton } from "@/components/ui/Skeleton";
import { LinkSpinner } from "@/components/ui/LinkPending";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] ?? "" : v ?? "");

/** The subtitle and the list both need every task; this fetches once per request. */
const loadTasks = cache(listAllTasks);

/** Everything the URL decides, worked out once and shared by the header, the filters and the list. */
interface View {
  user: UserDTO;
  isAdmin: boolean;
  myTeams: TeamDTO[];
  scope: Scope;
  selectedTeam: TeamDTO | null;
  teamMembers: Set<string> | null;
  mode: "list" | "board";
  q: string;
  status: string;
  priority: string;
  assignee: string;
  showDone: boolean;
  period: Period;
  scopeLabel: string;
  noTeam: boolean;
  /** Changes whenever any filter changes, so the list swaps to a skeleton instead of sitting stale. */
  key: string;
  showDoneHref: string;
}

function resolveView(sp: SP, user: UserDTO, teams: TeamDTO[], now: Date): View {
  const isAdmin = user.role === "admin";
  // Members never see "everyone": their widest view is their own team(s).
  const myTeams = isAdmin ? teams : teamsOf(user.id, teams);
  const requested = one(sp.scope);
  const scope: Scope = requested === "all" ? (isAdmin ? "all" : "team") : requested === "team" ? "team" : requested === "mine" ? "mine" : isAdmin ? "all" : "mine";
  const requestedTeam = one(sp.team);
  const selectedTeam = scope === "team" ? (myTeams.find((t) => t.id === requestedTeam) ?? (isAdmin ? myTeams[0] ?? null : null)) : null;
  const teamMembers = scope === "team" ? (selectedTeam ? new Set(selectedTeam.members) : isAdmin ? new Set<string>() : peerIds(user.id, teams)) : null;
  const status = one(sp.status);
  // Completed tasks are hidden unless asked for, and then limited to one period. Only admins may move the window.
  const showDone = one(sp.done) === "1" || status === "done";
  const period = resolvePeriod(isAdmin ? one(sp.range) : "", isAdmin ? one(sp.at) : "", now);
  const params = new URLSearchParams();
  for (const k of Object.keys(sp).sort()) { const s = one(sp[k]); if (s) params.set(k, s); }
  const key = params.toString();
  params.set("done", "1");
  return {
    user, isAdmin, myTeams, scope, selectedTeam, teamMembers,
    mode: one(sp.view) === "board" ? "board" : "list",
    q: one(sp.q).trim().toLowerCase(), status, priority: one(sp.priority), assignee: one(sp.assignee),
    showDone, period,
    scopeLabel: scope === "mine" ? "My tasks" : scope === "all" ? "Everyone" : selectedTeam ? selectedTeam.name : myTeams.length > 1 ? "All my teams" : myTeams[0]?.name ?? "My team",
    noTeam: scope === "team" && myTeams.length === 0,
    key,
    showDoneHref: `/tasks?${params.toString()}`,
  };
}

function filterTasks(all: TaskDTO[], v: View): { tasks: TaskDTO[]; hiddenDone: number } {
  // "My tasks" is work you have to do. Tasks you created for other people live under Team / Everyone and on the task they feed.
  let tasks: TaskDTO[] =
    v.scope === "mine" ? all.filter((t) => t.assignees.includes(v.user.id))
    : v.scope === "team" ? teamTasks(v.teamMembers ?? [], all)
    : all;
  if (v.q) tasks = tasks.filter((t) => t.title.toLowerCase().includes(v.q) || t.description.toLowerCase().includes(v.q) || t.tags.some((x) => x.includes(v.q)));
  if (v.status === "open") tasks = tasks.filter((t) => t.status !== "done");
  else if (STATUSES.includes(v.status as Status)) tasks = tasks.filter((t) => t.status === v.status);
  if (PRIORITIES.includes(v.priority as Priority)) tasks = tasks.filter((t) => t.priority === v.priority);
  if (v.assignee) tasks = tasks.filter((t) => t.assignees.includes(v.assignee));
  // Say how many finished tasks the view is hiding, with a one-click way to see them.
  const hiddenDone = v.showDone ? 0 : tasks.filter((t) => t.status === "done").length;
  tasks = tasks.filter((t) => t.status !== "done" || (v.showDone && inPeriod(t.completedAt ?? t.updatedAt, v.period)));
  return { tasks, hiddenDone };
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const [users, teams] = await Promise.all([listUsers(), listTeams()]);
  const v = resolveView(sp, user, teams, new Date());

  // The header and filter bar render at once; the counts and the list stream in behind a skeleton.
  // Keying the boundaries by the URL means every filter change swaps to the skeleton straight away.
  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={<Suspense key={v.key} fallback={<Skeleton inline className="h-4 w-44 align-middle" />}><Subtitle v={v} /></Suspense>}
        actions={<Link href="/tasks/new" className="btn btn-primary"><Plus className="size-4" />New task<LinkSpinner /></Link>}
      />
      <TaskFilters users={users} teams={v.myTeams} isAdmin={v.isAdmin} scope={v.scope} teamId={v.selectedTeam?.id ?? ""} period={v.period} showDone={v.showDone} />
      <Suspense key={v.key} fallback={v.mode === "board" ? <TasksBoardSkeleton columns={v.showDone ? 4 : 3} /> : <TasksListSkeleton />}>
        <TasksContent v={v} users={users} />
      </Suspense>
    </div>
  );
}

async function Subtitle({ v }: { v: View }) {
  const { tasks } = filterTasks(await loadTasks(), v);
  const now = new Date();
  const open = tasks.filter((t) => t.status !== "done").length;
  const overdue = tasks.filter((t) => taskHealth(t, now) === "overdue").length;
  return <>{v.scopeLabel} · {open} open{overdue > 0 ? ` · ${overdue} overdue` : ""}{v.showDone ? ` · ${tasks.length - open} completed (${v.period.label.toLowerCase()})` : ""}</>;
}

async function TasksContent({ v, users }: { v: View; users: UserDTO[] }) {
  if (v.noTeam) {
    return <EmptyState title={v.isAdmin ? "No teams yet" : "You're not in a team yet"} body={v.isAdmin ? "Create a team under Manage → Teams to see team boards." : "Ask your admin to add you to a team to see your peers' work here."} />;
  }
  const all = await loadTasks();
  const now = new Date();
  const umap = userMap(users);
  const titles = new Map(all.map((t) => [t.id, t.title]));
  const { tasks, hiddenDone } = filterTasks(all, v);
  const canEdit = (t: TaskDTO) => v.isAdmin || t.createdBy === v.user.id || t.assignees.includes(v.user.id);
  const cards: KanbanCard[] = tasks.map((t) => {
    const h = taskHealth(t, now);
    const prog = subtaskProgress(t);
    const owners = t.assignees.map((id) => umap.get(id)).filter((u): u is UserDTO => !!u).map((u) => ({ id: u.id, name: u.name, color: u.color }));
    const dist = deadlineDistance(t.deadline, now);
    const done = t.status === "done";
    return {
      id: t.id, title: t.title, priority: t.priority, status: t.status,
      deadlineLabel: done && t.completedAt ? `Done · ${latenessLabel(t.deadline, t.completedAt)}` : `${dist.label} · ${fmtDateTime(t.deadline, now)}`,
      deadlineTone: done ? (h === "done_late" ? "done_late" : "done_on_time") : dist.tone,
      owners, subDone: prog.done, subTotal: prog.total, canEdit: canEdit(t),
      pendingDeadline: !!pendingDeadlineRequest(t),
      dependency: !!t.parentId,
      parentTitle: t.parentId ? titles.get(t.parentId) : undefined,
      flagged: !!activeFlag(t),
    };
  });
  const columns: Status[] = v.showDone ? STATUSES : STATUSES.filter((s) => s !== "done");

  return (
    <>
      {v.mode === "board" ? (
        <KanbanBoard key={tasks.map((t) => t.id + t.status).join("|") + columns.length} cards={cards} columns={columns} doneLabel={v.period.label} />
      ) : (
        <TaskGroups tasks={tasks} users={umap} now={now} collapseDone={false} doneHint={`${periodTitle(v.period)} · most recent first`} titles={titles} />
      )}
      {hiddenDone > 0 && (
        <p className="mt-4 text-xs text-ink-3">
          {hiddenDone} completed {hiddenDone === 1 ? "task is" : "tasks are"} hidden here.{" "}
          <Link href={v.showDoneHref} className="font-semibold text-accent-deep hover:underline">Show completed</Link>
        </p>
      )}
    </>
  );
}
