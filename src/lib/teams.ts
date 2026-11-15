import { computeTeamStats, levelForScore, type Level, type TeamStats } from "./stats";
import type { TaskDTO, TeamDTO, UserDTO } from "./types";

/** Teams a person belongs to. */
export function teamsOf(userId: string, teams: TeamDTO[]): TeamDTO[] {
  return teams.filter((t) => t.members.includes(userId));
}

/** Everyone who shares at least one team with the person (including the person). */
export function peerIds(userId: string, teams: TeamDTO[]): Set<string> {
  const ids = new Set<string>();
  for (const t of teamsOf(userId, teams)) for (const m of t.members) ids.add(m);
  return ids;
}

/** Tasks owned by at least one of the given people. */
export function teamTasks(memberIds: Iterable<string>, tasks: TaskDTO[]): TaskDTO[] {
  const set = memberIds instanceof Set ? memberIds : new Set(memberIds);
  return tasks.filter((t) => t.assignees.some((a) => set.has(a)));
}

export interface TeamSummary {
  team: TeamDTO;
  members: UserDTO[];
  tasks: TaskDTO[];
  stats: TeamStats;
  /** Average ownership score of members who have one */
  score: number | null;
  level: Level;
  /** Members who are lagging or idle */
  needNudge: number;
}

export function summarizeTeam(team: TeamDTO, users: UserDTO[], tasks: TaskDTO[], now = new Date()): TeamSummary {
  const members = users.filter((u) => team.members.includes(u.id));
  const own = teamTasks(team.members, tasks);
  const stats = computeTeamStats(members, own, now);
  const scored = stats.people.filter((p) => p.score !== null);
  const score = scored.length ? Math.round(scored.reduce((sum, p) => sum + (p.score ?? 0), 0) / scored.length) : null;
  const level: Level = score === null ? "no_tasks" : levelForScore(score);
  const needNudge = stats.people.filter((p) => p.level === "lagging" || p.level === "idle").length;
  return { team, members, tasks: own, stats, score, level, needNudge };
}
