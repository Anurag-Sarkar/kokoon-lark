import { CalendarClock, Flame, Target, Activity } from "lucide-react";
import { LEVEL_META, type UserStats } from "@/lib/stats";
import { pct, timeAgo } from "@/lib/format";
import type { UserDTO } from "@/lib/types";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { LevelPill } from "@/components/ui/Pills";
import { Avatar } from "@/components/ui/Avatar";

const BORDER: Record<UserStats["level"], string> = {
  crushing: "border-l-good",
  on_track: "border-l-accent",
  slipping: "border-l-warn",
  lagging: "border-l-critical",
  idle: "border-l-ink-3",
  no_tasks: "border-l-line-2",
};

export function PulseCard({ user, stats, isSelf, now }: { user: UserDTO; stats: UserStats; isSelf: boolean; now: Date }) {
  const meta = LEVEL_META[stats.level];
  const delta = stats.completedThisWeek - stats.completedLastWeek;
  return (
    <section className={`card border-l-4 ${BORDER[stats.level]} p-5 sm:p-6 fade-up`}>
      <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
        <ScoreRing score={stats.score} level={stats.level} size={140} stroke={11}>
          <div className="text-center">
            <div className="text-[40px] leading-none font-semibold tracking-tight">{stats.score ?? "–"}</div>
            <div className="text-[11px] text-ink-3 mt-1 font-medium">ownership score</div>
          </div>
        </ScoreRing>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {!isSelf && <Avatar user={user} size="sm" />}
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">{isSelf ? "Where you stand" : user.name}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{meta.label}</h2>
            <LevelPill level={stats.level} />
          </div>
          <p className="mt-2 text-sm sm:text-[15px] text-ink-2 leading-relaxed max-w-prose">{stats.verdict}</p>

          <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Micro icon={<Target className="size-3.5" />} label="On-time (30d)" value={pct(stats.onTimeRate30 ?? stats.onTimeRate)} sub={stats.onTimeRate30 === null ? "no completions yet" : `${stats.doneOnTime30} of ${stats.doneOnTime30 + stats.doneLate30}`} />
            <Micro icon={<Flame className="size-3.5" />} label="Streak" value={`${stats.streakWeeks} wk`} sub={stats.streakWeeks >= 3 ? "keep it alive" : "weeks in a row"} />
            <Micro icon={<CalendarClock className="size-3.5" />} label="Moves (30d)" value={String(stats.deadlineMoves30)} sub={stats.deadlineMoves30 === 0 ? "none, nice" : "each one is logged"} warn={stats.deadlineMoves30 >= 2} />
            <Micro icon={<Activity className="size-3.5" />} label="This week" value={String(stats.completedThisWeek)} sub={delta === 0 ? "same as last week" : delta > 0 ? `+${delta} vs last week` : `${delta} vs last week`} />
          </dl>
          {stats.lastActivityAt && (
            <p className="mt-3 text-xs text-ink-3">Last activity {timeAgo(stats.lastActivityAt, now)}.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Micro({ icon, label, value, sub, warn = false }: { icon: React.ReactNode; label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-2 border border-line px-3 py-2.5 min-w-0">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-3 truncate">{icon}{label}</dt>
      <dd className={`mt-1 text-lg font-semibold leading-none tracking-tight ${warn ? "text-warn-text" : ""}`}>{value}</dd>
      {sub && <dd className="mt-1 text-[11px] text-ink-3 truncate">{sub}</dd>}
    </div>
  );
}
