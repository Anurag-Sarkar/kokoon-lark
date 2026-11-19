import Link from "next/link";
import { taskHealth } from "@/lib/stats";
import { deadlineDistance, fmtDateTime } from "@/lib/format";
import type { TaskDTO, UserDTO } from "@/lib/types";
import { LinkSpinner } from "@/components/ui/LinkPending";
import { DependencyPill, HealthPill, PriorityMark } from "@/components/ui/Pills";
import { EmptyState } from "@/components/shell/PageHeader";

/** The person's overdue and due-soon tasks, as fixed-column rows so the state pills line up down the list. */
export function AttentionList({ tasks, users, now, title = "Needs your attention", limit = 6 }: { tasks: TaskDTO[]; users: Map<string, UserDTO>; now: Date; title?: string; limit?: number }) {
  const hot = tasks
    .filter((t) => { const h = taskHealth(t, now); return h === "overdue" || h === "due_soon"; })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  const shown = hot.slice(0, limit);
  return (
    <section className="card p-4 sm:p-5 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-ink-3 mt-0.5">Overdue, or due within 48 hours</p>
        </div>
        {hot.length > 0 && <span className={`pill ${hot.some((t) => taskHealth(t, now) === "overdue") ? "bg-critical-soft text-critical-text" : "bg-warn-soft text-warn-text"}`}>{hot.length}</span>}
      </div>
      {shown.length === 0 ? (
        <EmptyState title="Nothing on fire" body="No overdue tasks and nothing due in the next 48 hours." />
      ) : (
        <ul className="divide-y divide-line -mx-2">
          {shown.map((t) => {
            const h = taskHealth(t, now);
            const d = deadlineDistance(t.deadline, now);
            return (
              <li key={t.id} className="row-link relative grid grid-cols-[1rem_minmax(0,1fr)_auto] md:grid-cols-[1rem_minmax(0,1fr)_8.25rem] items-center gap-x-3 px-2 py-2.5 rounded-lg">
                <Link href={`/tasks/${t.id}`} className="absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:outline-accent" aria-label={t.title}>
                  <LinkSpinner className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-surface" />
                </Link>
                <span className="flex justify-center"><PriorityMark priority={t.priority} /></span>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.title}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-3 leading-5 min-w-0">
                    {t.parentId && <DependencyPill />}
                    <span className="truncate">{fmtDateTime(t.deadline, now)}</span>
                  </div>
                </div>
                <span className="flex justify-end md:justify-start"><HealthPill health={h} label={d.label} /></span>
              </li>
            );
          })}
        </ul>
      )}
      {hot.length > shown.length && <Link href="/tasks" className="mt-3 text-xs font-semibold text-accent-deep hover:underline">See all {hot.length} →</Link>}
    </section>
  );
}
