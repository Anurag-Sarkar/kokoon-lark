import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { taskHealth } from "@/lib/stats";
import { deadlineDistance, fmtDateTime, latenessLabel } from "@/lib/format";
import { subtaskProgress } from "@/lib/taskViews";
import { pendingDeadlineRequest } from "@/lib/approvals";
import { activeFlag } from "@/lib/integrity";
import type { TaskDTO, UserDTO } from "@/lib/types";
import { OwnerList } from "@/components/ui/Avatar";
import { HealthPill, PriorityMark, StatusPill, Tag } from "@/components/ui/Pills";

export function TaskRow({ task, users, now, showOwners = true }: { task: TaskDTO; users: Map<string, UserDTO>; now: Date; showOwners?: boolean }) {
  const h = taskHealth(task, now);
  const owners = task.assignees.map((id) => users.get(id)).filter((u): u is UserDTO => !!u);
  const prog = subtaskProgress(task);
  const isDone = task.status === "done";
  const dist = deadlineDistance(task.deadline, now);
  const deadlineText = isDone && task.completedAt ? `Done ${fmtDateTime(task.completedAt, now)} · ${latenessLabel(task.deadline, task.completedAt)}` : `${fmtDateTime(task.deadline, now)} · ${dist.label}`;

  return (
    <Link href={`/tasks/${task.id}`} className="row-link grid grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5 border-t border-line first:border-t-0">
      <PriorityMark priority={task.priority} />
      <div className="min-w-0">
        <div className={`text-sm font-medium truncate ${isDone ? "text-ink-2" : ""}`}>{task.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
          <span className={h === "overdue" ? "text-critical-text font-semibold" : h === "due_soon" ? "text-warn-text font-semibold" : ""}>{deadlineText}</span>
          {task.deadlineChanges.length > 0 && <span>· moved {task.deadlineChanges.length}×</span>}
          {pendingDeadlineRequest(task) && <span className="text-accent-deep font-semibold">· change pending approval</span>}
          {task.parentId && <span>· dependency</span>}
          {activeFlag(task) && <span className="text-critical-text font-semibold">· flagged</span>}
          {task.tags.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}
          {showOwners && <span className="sm:hidden basis-full text-ink-2">{owners.length ? owners.map((u) => u.name).join(", ") : "Unassigned"}</span>}
        </div>
      </div>
      {prog.total > 0 ? (
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-ink-3 tnum" title="Subtasks">
          <CheckSquare className="size-3.5" />{prog.done}/{prog.total}
        </span>
      ) : <span className="hidden sm:block" />}
      {showOwners ? <span className="hidden sm:flex justify-end max-w-[280px]"><OwnerList users={owners} size="xs" className="justify-end" /></span> : <span className="hidden sm:block" />}
      <span className="justify-self-end">{isDone ? <HealthPill health={h} /> : h === "on_track" ? <StatusPill status={task.status} /> : <HealthPill health={h} label={dist.label} />}</span>
    </Link>
  );
}
