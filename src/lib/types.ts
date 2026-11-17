export type Role = "admin" | "member";
export type Priority = "low" | "medium" | "high" | "urgent";
export type Status = "todo" | "in_progress" | "review" | "done";

export const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];
export const STATUSES: Status[] = ["todo", "in_progress", "review", "done"];

export const STATUS_LABEL: Record<Status, string> = {
  todo: "To do",
  in_progress: "In progress",
  review: "In review",
  done: "Done",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  color: string;
  active: boolean;
  /** false for an invited person who hasn't set a password yet */
  hasPassword: boolean;
  /** true after a temporary password: the next sign-in must change it */
  mustChangePassword: boolean;
  emailNotifications: boolean;
  createdAt: string;
}

export interface TeamDTO {
  id: string;
  name: string;
  description: string;
  color: string;
  /** Team owner: reviews deadline changes asked for by members. Always also a member. */
  ownerId: string | null;
  members: string[];
  createdAt: string;
}

export interface SubtaskDTO {
  id: string;
  title: string;
  isDone: boolean;
  completedAt: string | null;
  completedBy: string | null;
  createdAt: string;
}

export interface DeadlineChangeDTO {
  id: string;
  oldDeadline: string;
  newDeadline: string;
  reason: string;
  /** Who asked for the change */
  changedBy: string;
  /** Who approved it. An admin moving a deadline directly approves it themselves. */
  approvedBy: string | null;
  createdAt: string;
}

export type DeadlineRequestStatus = "pending" | "approved" | "rejected" | "withdrawn";

/** A deadline change waiting for (or decided by) the team owner or an admin. */
export interface DeadlineRequestDTO {
  id: string;
  requestedBy: string;
  oldDeadline: string;
  newDeadline: string;
  reason: string;
  status: DeadlineRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  note: string;
  createdAt: string;
}

/** A reviewer's mark that the task was set to done without the work actually being done. Active while clearedAt is null. */
export interface FlagDTO {
  id: string;
  by: string;
  reason: string;
  createdAt: string;
  clearedBy: string | null;
  clearedAt: string | null;
  clearNote: string;
}

export interface CommentDTO {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
}

export type ActivityType =
  | "created"
  | "status"
  | "completed"
  | "reopened"
  | "deadline"
  | "deadline_requested"
  | "deadline_approved"
  | "deadline_rejected"
  | "deadline_withdrawn"
  | "dependency_added"
  | "flagged"
  | "flag_cleared"
  | "assignees"
  | "edited"
  | "subtask_added"
  | "subtask_edited"
  | "subtask_done"
  | "subtask_reopened"
  | "subtask_removed"
  | "comment";

export interface ActivityDTO {
  id: string;
  userId: string;
  type: ActivityType;
  detail: string;
  createdAt: string;
}

export interface TaskDTO {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  deadline: string;
  originalDeadline: string;
  createdBy: string;
  /** Set when this task is a dependency of another task */
  parentId: string | null;
  assignees: string[];
  tags: string[];
  completedAt: string | null;
  completedBy: string | null;
  subtasks: SubtaskDTO[];
  deadlineChanges: DeadlineChangeDTO[];
  deadlineRequests: DeadlineRequestDTO[];
  flags: FlagDTO[];
  comments: CommentDTO[];
  activity: ActivityDTO[];
  createdAt: string;
  updatedAt: string;
}

export type ActionResult = { ok: true } | { ok: false; error: string };
