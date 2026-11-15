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
  changedBy: string;
  createdAt: string;
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
  | "assignees"
  | "edited"
  | "subtask_added"
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
  assignees: string[];
  tags: string[];
  completedAt: string | null;
  completedBy: string | null;
  subtasks: SubtaskDTO[];
  deadlineChanges: DeadlineChangeDTO[];
  comments: CommentDTO[];
  activity: ActivityDTO[];
  createdAt: string;
  updatedAt: string;
}

export type ActionResult = { ok: true } | { ok: false; error: string };
