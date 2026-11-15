import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listAllTasks, listUsers, userMap } from "@/lib/queries";
import { taskHealth } from "@/lib/stats";
import { deadlineDistance, fmtDateTime, latenessLabel } from "@/lib/format";
import { subtaskProgress } from "@/lib/taskViews";
import { PRIORITIES, STATUSES, type Priority, type Status, type TaskDTO, type UserDTO } from "@/lib/types";
import { PageHeader } from "@/components/shell/PageHeader";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { TaskGroups } from "@/components/tasks/TaskGroups";
import { KanbanBoard, type KanbanCard } from "@/components/tasks/KanbanBoard";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] ?? "" : v ?? "");

export default async function TasksPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const now = new Date();
  const [users, all] = await Promise.all([listUsers(), listAllTasks()]);
  const umap = userMap(users);
  const isAdmin = user.role === "admin";

  const scope = one(sp.scope) || (isAdmin ? "all" : "mine");
  const view = one(sp.view) === "board" ? "board" : "list";
  const q = one(sp.q).trim().toLowerCase();
  const status = one(sp.status);
  const priority = one(sp.priority);
  const assignee = one(sp.assignee);

  let tasks: TaskDTO[] = scope === "mine" ? all.filter((t) => t.assignees.includes(user.id) || t.createdBy === user.id) : all;
  if (q) tasks = tasks.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some((x) => x.includes(q)));
  if (status === "open") tasks = tasks.filter((t) => t.status !== "done");
  else if (STATUSES.includes(status as Status)) tasks = tasks.filter((t) => t.status === status);
  if (PRIORITIES.includes(priority as Priority)) tasks = tasks.filter((t) => t.priority === priority);
  if (assignee) tasks = tasks.filter((t) => t.assignees.includes(assignee));

  const open = tasks.filter((t) => t.status !== "done").length;
  const overdue = tasks.filter((t) => taskHealth(t, now) === "overdue").length;

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

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={`${open} open${overdue > 0 ? ` · ${overdue} overdue` : ""} · ${tasks.length - open} completed`}
        actions={<Link href="/tasks/new" className="btn btn-primary"><Plus className="size-4" />New task</Link>}
      />
      <TaskFilters users={users} isAdmin={isAdmin} />
      {view === "board" ? <KanbanBoard key={tasks.map((t) => t.id + t.status).join("|")} cards={cards} /> : <TaskGroups tasks={tasks} users={umap} now={now} />}
    </div>
  );
}
