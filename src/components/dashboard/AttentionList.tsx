import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { taskHealth } from "@/lib/stats";
import { deadlineDistance, fmtDateTime } from "@/lib/format";
import type { TaskDTO, UserDTO } from "@/lib/types";
import { OwnerList } from "@/components/ui/Avatar";
import { LinkSpinner } from "@/components/ui/LinkPending";
import { HealthPill, PriorityMark } from "@/components/ui/Pills";
import { EmptyState } from "@/components/shell/PageHeader";

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
            const owners = t.assignees.map((id) => users.get(id)).filter((u): u is UserDTO => !!u);
            return (
              <li key={t.id} className="row-link relative flex items-center gap-3 px-2 py-2.5 rounded-lg">
                <Link href={`/tasks/${t.id}`} className="absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:outline-accent" aria-label={t.title}>
                  <LinkSpinner className="absolute right-7 top-1/2 -translate-y-1/2 rounded-full bg-surface" />
                </Link>
                <PriorityMark priority={t.priority} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium line-clamp-2 leading-snug">{t.title}</div>
                  <div className="text-[11px] text-ink-3">{fmtDateTime(t.deadline, now)}</div>
                </div>
                <OwnerList users={owners} size="xs" className="hidden sm:inline-flex max-w-[220px] justify-end" />
                <HealthPill health={h} label={d.label} />
                <ArrowRight className="size-3.5 text-ink-3 shrink-0" />
              </li>
            );
          })}
        </ul>
      )}
      {hot.length > shown.length && <Link href="/tasks" className="mt-3 text-xs font-semibold text-accent-deep hover:underline">See all {hot.length} →</Link>}
    </section>
  );
}
