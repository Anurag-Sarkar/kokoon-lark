import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { taskHealth } from "@/lib/stats";
import { deadlineDistance, fmtDateTime, latenessLabel } from "@/lib/format";
import { subtaskProgress } from "@/lib/taskViews";
import { pendingDeadlineRequest } from "@/lib/approvals";
import { activeFlag } from "@/lib/integrity";
import type { TaskDTO, UserDTO } from "@/lib/types";
import { OwnerCell } from "@/components/ui/Avatar";
import { LinkSpinner } from "@/components/ui/LinkPending";
import { DependencyPill, HealthPill, PriorityMark, StatusPill, Tag } from "@/components/ui/Pills";

/**
 * Column widths shared by every task row, so the subtask count, owner and status line up down a
 * list no matter what each row says. Each row is its own grid, so `auto` columns would size per row.
 */
export const TASK_ROW_COLS = "grid-cols-[1rem_minmax(0,1fr)] sm:grid-cols-[1rem_minmax(0,1fr)_3rem_10.5rem_8.25rem]";

/** Status or health of a task as one pill, the same choice everywhere a task is listed. */
export function TaskStatePill({ task, now }: { task: TaskDTO; now: Date }) {
  const h = taskHealth(task, now);
  if (task.status === "done") return <HealthPill health={h} />;
  if (h === "on_track") return <StatusPill status={task.status} />;
  return <HealthPill health={h} label={deadlineDistance(task.deadline, now).label} />;
}

/**
 * One task in a list. The whole row is clickable through a stretched link underneath, so the owner
 * chips can be links of their own without nesting anchors.
 *
 * Desktop columns: priority · title + details · subtasks · owner · state. The dependency tag sits
 * against the right edge of the title column, so it is in the same place on every row. On a phone
 * the row stacks: title, details, then owner and state on a footer line.
 */
export function TaskRow({ task, users, now, showOwners = true, parentTitle }: { task: TaskDTO; users: Map<string, UserDTO>; now: Date; showOwners?: boolean; /** title of the task this one feeds, when it is a dependency */ parentTitle?: string }) {
  const h = taskHealth(task, now);
  const owners = task.assignees.map((id) => users.get(id)).filter((u): u is UserDTO => !!u);
  const prog = subtaskProgress(task);
  const isDone = task.status === "done";
  const dist = deadlineDistance(task.deadline, now);
  const deadlineText = isDone && task.completedAt ? `Done ${fmtDateTime(task.completedAt, now)} · ${latenessLabel(task.deadline, task.completedAt)}` : `${fmtDateTime(task.deadline, now)} · ${dist.label}`;
  const dependency = !!task.parentId;

  return (
    <div className={`row-link relative grid ${TASK_ROW_COLS} items-center gap-x-3 px-3 py-2.5 border-t border-line first:border-t-0`}>
      <Link href={`/tasks/${task.id}`} className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2" aria-label={task.title}>
        <LinkSpinner className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-surface" />
      </Link>
      <span className="flex justify-center"><PriorityMark priority={task.priority} /></span>
      <div className="min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-sm font-medium truncate ${isDone ? "text-ink-2" : ""}`}>{task.title}</span>
          {dependency && <DependencyPill className="hidden sm:inline-flex ml-auto" />}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-ink-3 leading-5">
          {dependency && <DependencyPill className="sm:hidden" />}
          <span className={h === "overdue" ? "text-critical-text font-semibold" : h === "due_soon" ? "text-warn-text font-semibold" : ""}>{deadlineText}</span>
          {task.deadlineChanges.length > 0 && <span>· moved {task.deadlineChanges.length}×</span>}
          {pendingDeadlineRequest(task) && <span className="text-accent-deep font-semibold">· change pending approval</span>}
          {dependency && parentTitle && <span className="inline-flex max-w-[260px] min-w-0">· feeds&nbsp;<span className="truncate text-ink-2">{parentTitle}</span></span>}
          {activeFlag(task) && <span className="text-critical-text font-semibold">· flagged</span>}
          {task.tags.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}
          {prog.total > 0 && <span className="sm:hidden inline-flex items-center gap-1 tnum"><CheckSquare className="size-3" />{prog.done}/{prog.total}</span>}
        </div>
        <div className="sm:hidden mt-1.5 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-[11px] font-medium text-ink-2">{showOwners ? (owners.length ? owners.map((u) => u.name).join(", ") : "Unassigned") : ""}</span>
          <TaskStatePill task={task} now={now} />
        </div>
      </div>
      <span className="hidden sm:inline-flex items-center justify-end gap-1 text-[11px] text-ink-3 tnum" title={prog.total > 0 ? "Subtasks" : undefined}>
        {prog.total > 0 && <><CheckSquare className="size-3.5" />{prog.done}/{prog.total}</>}
      </span>
      <span className="hidden sm:flex min-w-0">{showOwners && <OwnerCell users={owners} />}</span>
      <span className="hidden sm:flex"><TaskStatePill task={task} now={now} /></span>
    </div>
  );
}
