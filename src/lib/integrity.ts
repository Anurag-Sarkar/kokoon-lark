/* Dependencies and integrity flags: pure helpers, safe on client and server. */

import type { FlagDTO, TaskDTO, TeamDTO, UserDTO } from "./types";

/** The flag currently standing against a task, if any. */
export function activeFlag(task: Pick<TaskDTO, "flags">): FlagDTO | null {
  return task.flags.find((f) => !f.clearedAt) ?? null;
}

export function isDependency(task: Pick<TaskDTO, "parentId">): boolean {
  return !!task.parentId;
}

/**
 * Who may flag a task as "marked done but not actually done" (and clear such a flag):
 * an admin, or the owner of a team that one of the task's owners belongs to. Never one of the task's own owners.
 */
export function canFlag(user: Pick<UserDTO, "id" | "role">, task: Pick<TaskDTO, "assignees">, teams: TeamDTO[]): boolean {
  if (task.assignees.includes(user.id)) return false;
  if (user.role === "admin") return true;
  return teams.some((t) => t.ownerId === user.id && task.assignees.some((a) => t.members.includes(a)));
}

/** Points taken off the ownership score for each active flag in the last 30 days. */
export const FLAG_PENALTY = 15;
