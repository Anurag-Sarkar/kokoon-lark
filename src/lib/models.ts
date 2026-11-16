import mongoose, { Schema, Types, type Model } from "mongoose";
import type { ActivityType, DeadlineRequestStatus, Priority, Role, Status } from "./types";

/* ---------- Raw document shapes (what .lean() returns) ---------- */

export interface UserDoc {
  _id: Types.ObjectId;
  name: string;
  email: string;
  /** empty string until an invited person sets a password */
  passwordHash: string;
  role: Role;
  title: string;
  color: string;
  active: boolean;
  mustChangePassword: boolean;
  emailNotifications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokenDoc {
  _id: Types.ObjectId;
  tokenHash: string;
  userId: Types.ObjectId;
  purpose: "invite" | "reset";
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface SessionDoc {
  _id: Types.ObjectId;
  token: string;
  userId: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

export interface PushSubscriptionDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface TeamDoc {
  _id: Types.ObjectId;
  name: string;
  description: string;
  color: string;
  /** Reviews deadline changes asked for by members; always also a member */
  owner: Types.ObjectId | null;
  members: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
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
  approvedBy: Types.ObjectId | null;
  createdAt: Date;
}

export interface DeadlineRequestDoc {
  _id: Types.ObjectId;
  requestedBy: Types.ObjectId;
  oldDeadline: Date;
  newDeadline: Date;
  reason: string;
  status: DeadlineRequestStatus;
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  note: string;
  createdAt: Date;
}

export interface FlagDoc {
  _id: Types.ObjectId;
  by: Types.ObjectId;
  reason: string;
  createdAt: Date;
  clearedBy: Types.ObjectId | null;
  clearedAt: Date | null;
  clearNote: string;
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
  parentId: Types.ObjectId | null;
  assignees: Types.ObjectId[];
  tags: string[];
  completedAt: Date | null;
  completedBy: Types.ObjectId | null;
  subtasks: SubtaskDoc[];
  deadlineChanges: DeadlineChangeDoc[];
  deadlineRequests: DeadlineRequestDoc[];
  flags: FlagDoc[];
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
    passwordHash: { type: String, default: "" },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    title: { type: String, default: "" },
    color: { type: String, default: "#2a78d6" },
    active: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const AuthTokenSchema = new Schema<AuthTokenDoc>(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    purpose: { type: String, enum: ["invite", "reset"], required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
AuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 3600 });

const SessionSchema = new Schema<SessionDoc>(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PushSubscriptionSchema = new Schema<PushSubscriptionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: { p256dh: { type: String, required: true }, auth: { type: String, required: true } },
    userAgent: { type: String, default: "" },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
PushSubscriptionSchema.index({ userId: 1 });

const TeamSchema = new Schema<TeamDoc>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    color: { type: String, default: "#2a78d6" },
    owner: { type: Schema.Types.ObjectId, ref: "User", default: null },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);
TeamSchema.index({ members: 1 });
TeamSchema.index({ owner: 1 });

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
  approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  createdAt: { type: Date, default: () => new Date() },
});

const DeadlineRequestSchema = new Schema<DeadlineRequestDoc>({
  requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  oldDeadline: { type: Date, required: true },
  newDeadline: { type: Date, required: true },
  reason: { type: String, required: true, trim: true },
  status: { type: String, enum: ["pending", "approved", "rejected", "withdrawn"], default: "pending" },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null },
  note: { type: String, default: "" },
  createdAt: { type: Date, default: () => new Date() },
});

const FlagSchema = new Schema<FlagDoc>({
  by: { type: Schema.Types.ObjectId, ref: "User", required: true },
  reason: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: () => new Date() },
  clearedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  clearedAt: { type: Date, default: null },
  clearNote: { type: String, default: "" },
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
    parentId: { type: Schema.Types.ObjectId, ref: "Task", default: null },
    assignees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    tags: [{ type: String }],
    completedAt: { type: Date, default: null },
    completedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    subtasks: [SubtaskSchema],
    deadlineChanges: [DeadlineChangeSchema],
    deadlineRequests: [DeadlineRequestSchema],
    flags: [FlagSchema],
    comments: [CommentSchema],
    activity: [ActivitySchema],
  },
  { timestamps: true }
);
TaskSchema.index({ assignees: 1, status: 1 });
TaskSchema.index({ deadline: 1 });
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ "deadlineRequests.status": 1 });
TaskSchema.index({ parentId: 1 });

/* ---------- Models (HMR-safe) ---------- */

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ?? mongoose.model<UserDoc>("User", UserSchema);

export const Session: Model<SessionDoc> =
  (mongoose.models.Session as Model<SessionDoc>) ??
  mongoose.model<SessionDoc>("Session", SessionSchema);

export const Task: Model<TaskDoc> =
  (mongoose.models.Task as Model<TaskDoc>) ?? mongoose.model<TaskDoc>("Task", TaskSchema);

export const Team: Model<TeamDoc> =
  (mongoose.models.Team as Model<TeamDoc>) ?? mongoose.model<TeamDoc>("Team", TeamSchema);

export const PushSubscription: Model<PushSubscriptionDoc> =
  (mongoose.models.PushSubscription as Model<PushSubscriptionDoc>) ??
  mongoose.model<PushSubscriptionDoc>("PushSubscription", PushSubscriptionSchema);

export const AuthToken: Model<AuthTokenDoc> =
  (mongoose.models.AuthToken as Model<AuthTokenDoc>) ?? mongoose.model<AuthTokenDoc>("AuthToken", AuthTokenSchema);
