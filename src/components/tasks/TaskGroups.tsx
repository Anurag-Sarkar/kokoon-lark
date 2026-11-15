import { ChevronDown } from "lucide-react";
import { groupTasks } from "@/lib/taskViews";
import type { TaskDTO, UserDTO } from "@/lib/types";
import { TaskRow } from "./TaskRow";
import { EmptyState } from "@/components/shell/PageHeader";

export function TaskGroups({ tasks, users, now, showOwners = true, collapseDone = true, doneHint }: { tasks: TaskDTO[]; users: Map<string, UserDTO>; now: Date; showOwners?: boolean; collapseDone?: boolean; doneHint?: string }) {
  const groups = groupTasks(tasks, now).filter((g) => g.tasks.length > 0);
  if (groups.length === 0) return <EmptyState title="No tasks match" body="Try clearing a filter, or create a new task." />;
  return (
    <div className="grid gap-4">
      {groups.map((g) => {
        const tone = g.key === "overdue" ? "text-critical-text" : g.key === "today" ? "text-warn-text" : "text-ink-2";
        const hint = g.key === "done" && doneHint ? doneHint : g.hint;
        const list = (
          <div className="card overflow-hidden">
            {g.tasks.map((t) => <TaskRow key={t.id} task={t} users={users} now={now} showOwners={showOwners} />)}
          </div>
        );
        if (g.key === "done" && collapseDone) {
          return (
            <details key={g.key} className="group">
              <summary className="flex items-center gap-2 cursor-pointer select-none mb-2 list-none">
                <ChevronDown className="size-4 text-ink-3 transition-transform group-open:rotate-180" />
                <span className={`text-sm font-semibold ${tone}`}>{g.label}</span>
                <span className="text-xs text-ink-3 tnum">{g.tasks.length}</span>
                <span className="text-xs text-ink-3">· {hint}</span>
              </summary>
              {list}
            </details>
          );
        }
        return (
          <section key={g.key}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-semibold ${tone}`}>{g.label}</span>
              <span className="text-xs text-ink-3 tnum">{g.tasks.length}</span>
              <span className="text-xs text-ink-3">· {hint}</span>
            </div>
            {list}
          </section>
        );
      })}
    </div>
  );
}
