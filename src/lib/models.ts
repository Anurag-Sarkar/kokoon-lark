import mongoose, { Schema, Types, type Model } from "mongoose";
import type { ActivityType, Priority, Role, Status } from "./types";

/* ---------- Raw document shapes (what .lean() returns) ---------- */

export interface UserDoc {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  title: string;
  color: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDoc {
  _id: Types.ObjectId;
  token: string;
  userId: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

export interface SubtaskDoc {
  _id: Types.ObjectId;
  title: string;
  isDone: boolean;
  completedAt: Date | null;
  completedBy: Types.ObjectId | null;
  createdAt: Date;
}

export interface DeadlineChangeDoc {
  _id: Types.ObjectId;
  oldDeadline: Date;
  newDeadline: Date;
  reason: string;
  changedBy: Types.ObjectId;
  createdAt: Date;
}

export interface CommentDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  body: string;
  createdAt: Date;
}

export interface ActivityDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: ActivityType;
  detail: string;
  createdAt: Date;
}

export interface TaskDoc {
  _id: Types.ObjectId;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  deadline: Date;
  originalDeadline: Date;
  createdBy: Types.ObjectId;
  assignees: Types.ObjectId[];
  tags: string[];
  completedAt: Date | null;
  completedBy: Types.ObjectId | null;
  subtasks: SubtaskDoc[];
  deadlineChanges: DeadlineChangeDoc[];
  comments: CommentDoc[];
  activity: ActivityDoc[];
  createdAt: Date;
  updatedAt: Date;
}

/* ---------- Schemas ---------- */

const UserSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    title: { type: String, default: "" },
    color: { type: String, default: "#2a78d6" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const SessionSchema = new Schema<SessionDoc>(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SubtaskSchema = new Schema<SubtaskDoc>({
  title: { type: String, required: true, trim: true },
  isDone: { type: Boolean, default: false },
  completedAt: { type: Date, default: null },
  completedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  createdAt: { type: Date, default: () => new Date() },
});

const DeadlineChangeSchema = new Schema<DeadlineChangeDoc>({
  oldDeadline: { type: Date, required: true },
  newDeadline: { type: Date, required: true },
  reason: { type: String, required: true, trim: true },
  changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: () => new Date() },
});

const CommentSchema = new Schema<CommentDoc>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  body: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: () => new Date() },
});

const ActivitySchema = new Schema<ActivityDoc>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, required: true },
  detail: { type: String, default: "" },
  createdAt: { type: Date, default: () => new Date() },
});

const TaskSchema = new Schema<TaskDoc>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "done"],
      default: "todo",
    },
    deadline: { type: Date, required: true },
    originalDeadline: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    tags: [{ type: String }],
    completedAt: { type: Date, default: null },
    completedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    subtasks: [SubtaskSchema],
    deadlineChanges: [DeadlineChangeSchema],
    comments: [CommentSchema],
    activity: [ActivitySchema],
  },
  { timestamps: true }
);
TaskSchema.index({ assignees: 1, status: 1 });
TaskSchema.index({ deadline: 1 });
TaskSchema.index({ createdBy: 1 });

/* ---------- Models (HMR-safe) ---------- */

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ?? mongoose.model<UserDoc>("User", UserSchema);

export const Session: Model<SessionDoc> =
  (mongoose.models.Session as Model<SessionDoc>) ??
  mongoose.model<SessionDoc>("Session", SessionSchema);

export const Task: Model<TaskDoc> =
  (mongoose.models.Task as Model<TaskDoc>) ?? mongoose.model<TaskDoc>("Task", TaskSchema);
