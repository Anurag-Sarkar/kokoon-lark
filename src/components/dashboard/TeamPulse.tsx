import Link from "next/link";
import type { UserStats } from "@/lib/stats";
import type { UserDTO } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { LevelPill } from "@/components/ui/Pills";
import { SectionTitle } from "@/components/shell/PageHeader";

export function TeamPulse({ people, currentUserId, linkToAdmin }: { people: { user: UserDTO; stats: UserStats }[]; currentUserId: string; linkToAdmin: boolean }) {
  const sorted = [...people].sort((a, b) => (b.stats.score ?? -1) - (a.stats.score ?? -1));
  return (
    <section>
      <SectionTitle hint="Everyone sees the same picture. Ownership is visible.">Team pulse</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {sorted.map(({ user, stats }, i) => {
          const isSelf = user.id === currentUserId;
          const body = (
            <>
              <div className="flex items-center justify-between">
                <Avatar user={user} size="md" />
                <span className="text-[11px] font-semibold text-ink-3 tnum">#{i + 1}</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <ScoreRing score={stats.score} level={stats.level} size={48} stroke={5}>
                  <span className="text-xs font-semibold tnum">{stats.score ?? "–"}</span>
                </ScoreRing>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{isSelf ? "You" : user.name.split(" ")[0]}</div>
                  <div className="text-[11px] text-ink-3 truncate">{stats.ongoing} open · {stats.overdue} overdue</div>
                </div>
              </div>
              <div className="mt-3"><LevelPill level={stats.level} size="sm" /></div>
            </>
          );
          const cls = `card p-3.5 block ${isSelf ? "ring-2 ring-ink/80" : ""} ${linkToAdmin ? "hover:border-line-2 transition" : ""}`;
          return linkToAdmin ? (
            <Link key={user.id} href={`/admin/people/${user.id}`} className={cls}>{body}</Link>
          ) : (
            <div key={user.id} className={cls}>{body}</div>
          );
        })}
      </div>
    </section>
  );
}
