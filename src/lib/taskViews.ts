import { addDays, endOfDay, isToday } from "date-fns";
import { taskHealth } from "./stats";
import type { TaskDTO } from "./types";

export type GroupKey = "overdue" | "today" | "week" | "later" | "done";

export interface TaskGroup {
  key: GroupKey;
  label: string;
  hint: string;
  tasks: TaskDTO[];
}

export function groupTasks(tasks: TaskDTO[], now = new Date()): TaskGroup[] {
  const groups: Record<GroupKey, TaskDTO[]> = { overdue: [], today: [], week: [], later: [], done: [] };
  const weekEnd = endOfDay(addDays(now, 7)).getTime();
  for (const t of tasks) {
    const h = taskHealth(t, now);
    if (h === "done_on_time" || h === "done_late") { groups.done.push(t); continue; }
    if (h === "overdue") { groups.overdue.push(t); continue; }
    const dl = new Date(t.deadline);
    if (isToday(dl)) groups.today.push(t);
    else if (dl.getTime() <= weekEnd) groups.week.push(t);
    else groups.later.push(t);
  }
  const byDeadline = (a: TaskDTO, b: TaskDTO) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  groups.overdue.sort(byDeadline); groups.today.sort(byDeadline); groups.week.sort(byDeadline); groups.later.sort(byDeadline);
  groups.done.sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime());
  const meta: Record<GroupKey, { label: string; hint: string }> = {
    overdue: { label: "Overdue", hint: "Past the deadline and still open" },
    today: { label: "Due today", hint: "Finish these before the day ends" },
    week: { label: "This week", hint: "Due in the next 7 days" },
    later: { label: "Later", hint: "More than a week out" },
    done: { label: "Completed", hint: "Most recent first" },
  };
  return (Object.keys(groups) as GroupKey[]).map((k) => ({ key: k, ...meta[k], tasks: groups[k] }));
}

export function subtaskProgress(t: TaskDTO): { done: number; total: number; pct: number } {
  const total = t.subtasks.length;
  const done = t.subtasks.filter((s) => s.isDone).length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}
