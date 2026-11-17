import Link from "next/link";
import type { TeamSummary } from "@/lib/teams";
import { pct } from "@/lib/format";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { LevelPill } from "@/components/ui/Pills";
import { OwnerList, PersonLink } from "@/components/ui/Avatar";
import { LinkSpinner } from "@/components/ui/LinkPending";

/** The whole card opens the team through a stretched link underneath; the owner and member chips link to people. */
export function TeamCard({ summary: s }: { summary: TeamSummary }) {
  const { team, members, stats } = s;
  const owner = team.ownerId ? members.find((m) => m.id === team.ownerId) ?? null : null;
  const cells: { label: string; value: string | number; cls: string }[] = [
    { label: "Open", value: stats.activeTasks, cls: "" },
    { label: "Overdue", value: stats.overdueTasks, cls: stats.overdueTasks > 0 ? "text-critical-text" : "" },
    { label: "Done this wk", value: stats.completedThisWeek, cls: "text-good-text" },
    { label: "On-time 30d", value: pct(stats.onTimeRate30), cls: "" },
  ];
  return (
    <div className="card relative p-4 hover:border-line-2 transition" style={{ borderLeft: `4px solid ${team.color}` }}>
      <Link href={`/admin/teams/${team.id}`} className="absolute inset-0 rounded-[inherit] focus-visible:outline-2 focus-visible:outline-accent" aria-label={`${team.name} team`}>
        <LinkSpinner className="absolute right-3 top-3" />
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{team.name}</div>
          <div className="text-xs text-ink-3 mt-0.5 truncate">{members.length} {members.length === 1 ? "person" : "people"}{team.description ? ` · ${team.description}` : ""}</div>
          <div className="text-xs mt-0.5 flex items-center gap-1 min-w-0">{owner ? <><span className="text-ink-3">Owner ·</span><PersonLink user={owner} size="xs" nameClassName="text-xs font-medium text-ink-2" /></> : <span className="text-warn-text">No owner yet</span>}</div>
          <div className="mt-2 flex items-center gap-2">
            <LevelPill level={s.level} size="sm" />
            {s.needNudge > 0 && <span className="text-[11px] font-semibold text-critical-text">{s.needNudge} need{s.needNudge === 1 ? "s" : ""} a nudge</span>}
          </div>
        </div>
        <ScoreRing score={s.score} level={s.level} size={56} stroke={6}>
          <span className="text-sm font-semibold tnum">{s.score ?? "–"}</span>
        </ScoreRing>
      </div>
      <dl className="mt-3 grid grid-cols-4 gap-2">
        {cells.map((c) => (
          <div key={c.label} className="rounded-lg bg-surface-2 px-2 py-1.5 min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 truncate">{c.label}</dt>
            <dd className={`text-base font-semibold tnum leading-tight ${c.cls}`}>{c.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 pt-3 border-t border-line">
        <OwnerList users={members} size="xs" emptyLabel="No members yet" />
      </div>
    </div>
  );
}
