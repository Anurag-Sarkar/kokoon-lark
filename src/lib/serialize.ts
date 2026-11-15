import type { TaskDoc, TeamDoc, UserDoc } from "./models";
import type { TaskDTO, TeamDTO, UserDTO } from "./types";

const iso = (d: Date | null | undefined): string | null => (d ? new Date(d).toISOString() : null);
const isoReq = (d: Date): string => new Date(d).toISOString();

export function toUserDTO(u: UserDoc): UserDTO {
  return {
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    title: u.title ?? "",
    color: u.color ?? "#2a78d6",
    active: u.active !== false,
    createdAt: isoReq(u.createdAt),
  };
}

export function toTeamDTO(t: TeamDoc): TeamDTO {
  return {
    id: t._id.toString(),
    name: t.name,
    description: t.description ?? "",
    color: t.color ?? "#2a78d6",
    members: (t.members ?? []).map((m) => m.toString()),
    createdAt: isoReq(t.createdAt),
  };
}

export function toTaskDTO(t: TaskDoc): TaskDTO {
  return {
    id: t._id.toString(),
    title: t.title,
    description: t.description ?? "",
    priority: t.priority,
    status: t.status,
    deadline: isoReq(t.deadline),
    originalDeadline: isoReq(t.originalDeadline ?? t.deadline),
    createdBy: t.createdBy.toString(),
    assignees: (t.assignees ?? []).map((a) => a.toString()),
    tags: t.tags ?? [],
    completedAt: iso(t.completedAt),
    completedBy: t.completedBy ? t.completedBy.toString() : null,
    subtasks: (t.subtasks ?? []).map((s) => ({
      id: s._id.toString(),
      title: s.title,
      isDone: !!s.isDone,
      completedAt: iso(s.completedAt),
      completedBy: s.completedBy ? s.completedBy.toString() : null,
      createdAt: isoReq(s.createdAt),
    })),
    deadlineChanges: (t.deadlineChanges ?? []).map((d) => ({
      id: d._id.toString(),
      oldDeadline: isoReq(d.oldDeadline),
      newDeadline: isoReq(d.newDeadline),
      reason: d.reason,
      changedBy: d.changedBy.toString(),
      createdAt: isoReq(d.createdAt),
    })),
    comments: (t.comments ?? []).map((c) => ({
      id: c._id.toString(),
      userId: c.userId.toString(),
      body: c.body,
      createdAt: isoReq(c.createdAt),
    })),
    activity: (t.activity ?? []).map((a) => ({
      id: a._id.toString(),
      userId: a.userId.toString(),
      type: a.type,
      detail: a.detail ?? "",
      createdAt: isoReq(a.createdAt),
    })),
    createdAt: isoReq(t.createdAt),
    updatedAt: isoReq(t.updatedAt),
  };
}
