/* Who may change a deadline directly, who must ask, and who decides. Pure helpers, safe on client and server. */

import type { DeadlineRequestDTO, TaskDTO, TeamDTO, UserDTO } from "./types";

export function pendingDeadlineRequest(task: Pick<TaskDTO, "deadlineRequests">): DeadlineRequestDTO | null {
  return task.deadlineRequests.find((r) => r.status === "pending") ?? null;
}

export function ownedTeams(userId: string, teams: TeamDTO[]): TeamDTO[] {
  return teams.filter((t) => t.ownerId === userId);
}

export function isTeamOwner(userId: string, teams: TeamDTO[]): boolean {
  return teams.some((t) => t.ownerId === userId);
}

/** Admins move deadlines directly. Everyone else, team owners included, asks the level above. */
export function changesApplyDirectly(user: Pick<UserDTO, "role">): boolean {
  return user.role === "admin";
}

/**
 * Can this person decide a request made by `requesterId`?
 * Admins always can. A team owner can for the members of their teams. Nobody decides their own request.
 */
export function canReview(user: Pick<UserDTO, "id" | "role">, requesterId: string, teams: TeamDTO[]): boolean {
  if (user.id === requesterId) return false;
  if (user.role === "admin") return true;
  return teams.some((t) => t.ownerId === user.id && t.members.includes(requesterId));
}

/** Everyone who could approve a request from this person: the owners of their teams, plus every admin. */
export function reviewersFor(requesterId: string, users: UserDTO[], teams: TeamDTO[]): UserDTO[] {
  return users.filter((u) => u.active && canReview(u, requesterId, teams));
}

/** "Priya Nair (or an admin)" — who a request will wait on, for the UI and activity log. */
export function reviewerLabel(reviewers: UserDTO[]): string {
  const owners = reviewers.filter((u) => u.role !== "admin");
  const admins = reviewers.filter((u) => u.role === "admin");
  if (owners.length > 0) return `${owners.map((u) => u.name).join(" or ")}${admins.length ? " (or an admin)" : ""}`;
  if (admins.length === 1) return admins[0]!.name;
  return "an admin";
}
