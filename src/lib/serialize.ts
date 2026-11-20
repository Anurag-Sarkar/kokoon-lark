import type { BulletinPostDoc, TaskDoc, TeamDoc, UserDoc } from "./models";
import type { BulletinPostDTO, TaskDTO, TeamDTO, UserDTO } from "./types";

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
    hasPassword: !!u.passwordHash,
    mustChangePassword: !!u.mustChangePassword,
    emailNotifications: u.emailNotifications !== false,
    createdAt: isoReq(u.createdAt),
  };
}

export function toTeamDTO(t: TeamDoc): TeamDTO {
  return {
    id: t._id.toString(),
    name: t.name,
    description: t.description ?? "",
    color: t.color ?? "#2a78d6",
    ownerId: t.owner ? t.owner.toString() : null,
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
    parentId: t.parentId ? t.parentId.toString() : null,
    bulletinId: t.bulletinId ? t.bulletinId.toString() : null,
    assignees: (t.assignees ?? []).map((a) => a.toString()),
    tags: t.tags ?? [],
    completedAt: iso(t.completedAt),
    completedBy: t.completedBy ? t.completedBy.toString() : null,
    subtasks: (t.subtasks ?? []).map((s) => ({
      id: s._id.toString(),
      title: s.title,
      isDone: !!s.isDone,
      plannedFor: iso(s.plannedFor),
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
      approvedBy: d.approvedBy ? d.approvedBy.toString() : null,
      createdAt: isoReq(d.createdAt),
    })),
    deadlineRequests: (t.deadlineRequests ?? []).map((r) => ({
      id: r._id.toString(),
      requestedBy: r.requestedBy.toString(),
      oldDeadline: isoReq(r.oldDeadline),
      newDeadline: isoReq(r.newDeadline),
      reason: r.reason,
      status: r.status ?? "pending",
      reviewedBy: r.reviewedBy ? r.reviewedBy.toString() : null,
      reviewedAt: iso(r.reviewedAt),
      note: r.note ?? "",
      createdAt: isoReq(r.createdAt),
    })),
    flags: (t.flags ?? []).map((f) => ({
      id: f._id.toString(),
      by: f.by.toString(),
      reason: f.reason,
      createdAt: isoReq(f.createdAt),
      clearedBy: f.clearedBy ? f.clearedBy.toString() : null,
      clearedAt: iso(f.clearedAt),
      clearNote: f.clearNote ?? "",
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

export function toBulletinPostDTO(p: BulletinPostDoc): BulletinPostDTO {
  return {
    id: p._id.toString(),
    title: p.title,
    description: p.description ?? "",
    priority: p.priority ?? "medium",
    tags: p.tags ?? [],
    wantedBy: iso(p.wantedBy),
    postedBy: p.postedBy.toString(),
    status: p.status ?? "open",
    pickedBy: p.pickedBy ? p.pickedBy.toString() : null,
    pickedAt: iso(p.pickedAt),
    taskId: p.taskId ? p.taskId.toString() : null,
    createdAt: isoReq(p.createdAt),
    updatedAt: isoReq(p.updatedAt),
  };
}
