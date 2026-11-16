"use server";

import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, destroySession, getCurrentUser, startSession } from "./auth";
import { INVITE_TTL_MS, issueToken } from "./tokens";
import { appUrl, mailConfigured, sendMail } from "./mail";
import { inviteEmail, tempPasswordEmail } from "./emails";
import { notifyAssigned, notifyDeadlineDecision, notifyDeadlineRequest, notifyFlagged } from "./notify";
import { toTeamDTO, toUserDTO } from "./serialize";
import { canReview, changesApplyDirectly, reviewerLabel, reviewersFor } from "./approvals";
import { canFlag } from "./integrity";
import { AVATAR_COLORS } from "./palette";
import { connectDB } from "./mongodb";
import { Task, Team, User, type TaskDoc } from "./models";
import { isValidId } from "./queries";
import { PRIORITIES, STATUSES, STATUS_LABEL, type ActionResult, type ActivityType, type Priority, type Role, type Status, type UserDTO } from "./types";
import { fmtShortDateTime, shiftLabel } from "./format";

/* ---------------- helpers ---------------- */

function fail(error: string): ActionResult {
  return { ok: false, error };
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isHexColor = (s: string) => /^#[0-9a-f]{6}$/i.test(s);

const oid = (id: string) => new Types.ObjectId(id);

function revalidateAll() {
  revalidatePath("/", "layout");
}

async function requireActor(): Promise<UserDTO> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

function canEdit(user: UserDTO, task: Pick<TaskDoc, "createdBy" | "assignees">): boolean {
  if (user.role === "admin") return true;
  if (task.createdBy.toString() === user.id) return true;
  return task.assignees.some((a) => a.toString() === user.id);
}

async function loadEditableTask(taskId: string, user: UserDTO): Promise<TaskDoc | string> {
  if (!isValidId(taskId)) return "Task not found.";
  await connectDB();
  const task = await Task.findById(taskId).lean();
  if (!task) return "Task not found.";
  if (!canEdit(user, task)) return "You don't have permission to change this task.";
  return task;
}

function activity(userId: string, type: ActivityType, detail: string) {
  return { userId: new Types.ObjectId(userId), type, detail, createdAt: new Date() };
}

function parseDeadline(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseTags(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t, i, arr) => t.length > 0 && arr.indexOf(t) === i)
    .slice(0, 10);
}

/* ---------------- auth ---------------- */

export type FormState = { error?: string; message?: string; link?: string; delivered?: boolean } | undefined;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  let userId: string | null = null;
  let mustChange = false;
  try {
    await connectDB();
    const user = await User.findOne({ email }).lean();
    if (!user) return { error: "That email and password don't match." };
    if (!user.passwordHash) return { error: "This account hasn't been set up yet. Use the invite link from your email, or ask your admin to resend it." };
    if (!(await bcrypt.compare(password, user.passwordHash))) return { error: "That email and password don't match." };
    if (user.active === false) return { error: "This account has been deactivated. Ask your admin." };
    userId = user._id.toString();
    mustChange = !!user.mustChangePassword;
  } catch {
    return { error: "Could not reach the database. Is MongoDB running?" };
  }

  await startSession(userId);
  redirect(mustChange ? "/account?change=required" : "/dashboard");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token).catch(() => undefined);
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

/* ---------------- tasks ---------------- */

export async function createTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireActor();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priority = String(formData.get("priority") ?? "medium") as Priority;
  const deadline = parseDeadline(String(formData.get("deadline") ?? ""));
  const assignees = formData.getAll("assignees").map(String).filter(isValidId);
  const tags = parseTags(String(formData.get("tags") ?? ""));
  const subtaskTitles = formData.getAll("subtasks").map((s) => String(s).trim()).filter(Boolean);

  if (title.length < 2) return { error: "Give the task a title." };
  if (title.length > 200) return { error: "Title is too long (200 characters max)." };
  if (!PRIORITIES.includes(priority)) return { error: "Pick a valid priority." };
  if (!deadline) return { error: "Every task needs a deadline." };
  if (assignees.length === 0) return { error: "Assign the task to at least one person." };

  await connectDB();
  const validUsers = await User.find({ _id: { $in: assignees }, active: { $ne: false } }).select("_id").lean();
  if (validUsers.length !== assignees.length) return { error: "One of the assignees no longer exists." };

  const names = (await User.find({ _id: { $in: assignees } }).select("name").lean()).map((u) => u.name);
  const created = await Task.create({
    title,
    description,
    priority,
    status: "todo",
    deadline,
    originalDeadline: deadline,
    createdBy: new Types.ObjectId(user.id),
    assignees: assignees.map((a) => new Types.ObjectId(a)),
    tags,
    subtasks: subtaskTitles.map((t) => ({ title: t })),
    activity: [
      activity(user.id, "created", `Created the task and assigned it to ${names.join(", ")}. Deadline ${fmtShortDateTime(deadline.toISOString())}.`),
    ],
  });

  await notifyAssigned(created, assignees, user, names);
  revalidateAll();
  redirect(`/tasks/${created._id.toString()}`);
}

export async function updateTaskDetails(
  taskId: string,
  input: { title: string; description: string; priority: Priority; tags: string }
): Promise<ActionResult> {
  const user = await requireActor();
  const task = await loadEditableTask(taskId, user);
  if (typeof task === "string") return fail(task);

  const title = input.title.trim();
  if (title.length < 2) return fail("Title can't be empty.");
  if (!PRIORITIES.includes(input.priority)) return fail("Invalid priority.");

  await Task.updateOne(
    { _id: task._id },
    {
      $set: { title, description: input.description.trim(), priority: input.priority, tags: parseTags(input.tags) },
      $push: { activity: activity(user.id, "edited", "Edited the task details.") },
    }
  );
  revalidateAll();
  return { ok: true };
}

export async function setTaskStatus(taskId: string, status: Status): Promise<ActionResult> {
  const user = await requireActor();
  if (!STATUSES.includes(status)) return fail("Invalid status.");
  const task = await loadEditableTask(taskId, user);
  if (typeof task === "string") return fail(task);
  if (task.status === status) return { ok: true };

  const now = new Date();
  const set: Record<string, unknown> = { status };
  let act;
  if (status === "done") {
    set.completedAt = now;
    set.completedBy = new Types.ObjectId(user.id);
    const late = now.getTime() > new Date(task.deadline).getTime();
    act = activity(user.id, "completed", late ? "Marked the task done — after the deadline." : "Marked the task done — on time.");
  } else if (task.status === "done") {
    set.completedAt = null;
    set.completedBy = null;
    act = activity(user.id, "reopened", `Reopened the task and moved it to ${STATUS_LABEL[status]}.`);
  } else {
    act = activity(user.id, "status", `Moved from ${STATUS_LABEL[task.status]} to ${STATUS_LABEL[status]}.`);
  }

  await Task.updateOne({ _id: task._id }, { $set: set, $push: { activity: act } });
  revalidateAll();
  return { ok: true };
}

/**
 * A dependency can't be due after the task it feeds, and a task can't be due before its open dependencies.
 * Returns a message explaining the conflict, or null when the new deadline is fine.
 */
async function deadlineConflict(task: Pick<TaskDoc, "_id" | "parentId">, newDeadline: Date): Promise<string | null> {
  if (task.parentId) {
    const parent = await Task.findById(task.parentId).select("title deadline").lean();
    if (parent && newDeadline.getTime() > new Date(parent.deadline).getTime()) {
      return `This is a dependency of "${parent.title}", which is due ${fmtShortDateTime(new Date(parent.deadline).toISOString())}. Pick a time on or before that, or move that task's deadline first.`;
    }
  }
  const blocking = await Task.find({ parentId: task._id, status: { $ne: "done" }, deadline: { $gt: newDeadline } }).select("title deadline").sort({ deadline: -1 }).lean();
  if (blocking.length > 0) {
    const list = blocking.map((b) => `"${b.title}" (${fmtShortDateTime(new Date(b.deadline).toISOString())})`).join(", ");
    return blocking.length === 1
      ? `An open dependency is due after that: ${list}. Move it earlier first.`
      : `${blocking.length} open dependencies are due after that: ${list}. Move them earlier first.`;
  }
  return null;
}

export type DeadlineResult = { ok: true; applied: boolean; reviewers: string[] } | { ok: false; error: string };

/**
 * Admins move deadlines directly. Everyone else files a request that their team owner (or an admin)
 * must approve; the current deadline keeps counting until then.
 */
export async function changeDeadline(taskId: string, newDeadlineRaw: string, reason: string): Promise<DeadlineResult> {
  const user = await requireActor();
  const task = await loadEditableTask(taskId, user);
  if (typeof task === "string") return { ok: false, error: task };
  const newDeadline = parseDeadline(newDeadlineRaw);
  if (!newDeadline) return { ok: false, error: "Pick a valid date and time." };
  const trimmed = reason.trim();
  if (trimmed.length < 5) return { ok: false, error: "Give a real reason (at least 5 characters). It will be visible to the team." };
  if (newDeadline.getTime() === new Date(task.deadline).getTime()) return { ok: false, error: "That's already the deadline." };
  const conflict = await deadlineConflict(task, newDeadline);
  if (conflict) return { ok: false, error: conflict };
  const oldIso = new Date(task.deadline).toISOString();
  const newIso = newDeadline.toISOString();
  const shift = `${shiftLabel(oldIso, newIso)}: ${fmtShortDateTime(oldIso)} → ${fmtShortDateTime(newIso)}`;

  if (changesApplyDirectly(user)) {
    await Task.updateOne(
      { _id: task._id },
      {
        $set: { deadline: newDeadline },
        $push: {
          deadlineChanges: { oldDeadline: task.deadline, newDeadline, reason: trimmed, changedBy: oid(user.id), approvedBy: oid(user.id) },
          activity: activity(user.id, "deadline", `Deadline ${shift}. Reason: ${trimmed}`),
        },
      }
    );
    revalidateAll();
    return { ok: true, applied: true, reviewers: [] };
  }

  if ((task.deadlineRequests ?? []).some((r) => r.status === "pending")) {
    return { ok: false, error: "A deadline change for this task is already waiting for approval. Withdraw it first to ask for a different date." };
  }
  const [teamDocs, userDocs] = await Promise.all([Team.find({}).lean(), User.find({ active: { $ne: false } }).lean()]);
  const reviewers = reviewersFor(user.id, userDocs.map(toUserDTO), teamDocs.map(toTeamDTO));
  if (reviewers.length === 0) return { ok: false, error: "Nobody can approve this yet. Ask an admin to set an owner for your team." };

  await Task.updateOne(
    { _id: task._id },
    {
      $push: {
        deadlineRequests: { requestedBy: oid(user.id), oldDeadline: task.deadline, newDeadline, reason: trimmed, status: "pending" },
        activity: activity(user.id, "deadline_requested", `Asked to move the deadline (${shift}). Reason: ${trimmed}${/[.!?]$/.test(trimmed) ? "" : "."} Waiting for ${reviewerLabel(reviewers)}.`),
      },
    }
  );
  await notifyDeadlineRequest(task, { oldDeadline: task.deadline, newDeadline, reason: trimmed }, user, reviewers.map((r) => r.id));
  revalidateAll();
  return { ok: true, applied: false, reviewers: reviewers.map((r) => r.name) };
}

/** Team owner or admin decides a pending request. Approving moves the deadline and logs the change under the requester's name. */
export async function reviewDeadlineRequest(taskId: string, requestId: string, decision: "approve" | "reject", note = ""): Promise<ActionResult> {
  const user = await requireActor();
  if (!isValidId(taskId) || !isValidId(requestId)) return fail("Request not found.");
  await connectDB();
  const task = await Task.findById(taskId).lean();
  if (!task) return fail("Task not found.");
  const req = (task.deadlineRequests ?? []).find((r) => r._id.toString() === requestId);
  if (!req) return fail("Request not found.");
  if (req.status !== "pending") return fail("This request has already been decided.");
  const teams = (await Team.find({}).lean()).map(toTeamDTO);
  const requesterId = req.requestedBy.toString();
  if (!canReview(user, requesterId, teams)) return fail("Only the owner of this person's team or an admin can decide this.");

  const cleanNote = note.trim().slice(0, 500);
  const oldIso = new Date(task.deadline).toISOString();
  const newIso = new Date(req.newDeadline).toISOString();
  const approve = decision === "approve";
  const reqSet: Record<string, unknown> = {
    "deadlineRequests.$.status": approve ? "approved" : "rejected",
    "deadlineRequests.$.reviewedBy": oid(user.id),
    "deadlineRequests.$.reviewedAt": new Date(),
    "deadlineRequests.$.note": cleanNote,
  };
  const noteText = cleanNote ? ` Note: ${cleanNote}` : "";
  if (approve) {
    const conflict = await deadlineConflict(task, new Date(req.newDeadline)); // things may have moved since it was asked
    if (conflict) return fail(`Can't approve this as it stands. ${conflict}`);
    await Task.updateOne(
      { _id: task._id, "deadlineRequests._id": req._id },
      {
        $set: { deadline: req.newDeadline, ...reqSet },
        $push: {
          deadlineChanges: { oldDeadline: task.deadline, newDeadline: req.newDeadline, reason: req.reason, changedBy: req.requestedBy, approvedBy: oid(user.id) },
          activity: activity(user.id, "deadline_approved", `Approved the deadline change ${shiftLabel(oldIso, newIso)}: ${fmtShortDateTime(oldIso)} → ${fmtShortDateTime(newIso)}.${noteText}`),
        },
      }
    );
  } else {
    await Task.updateOne(
      { _id: task._id, "deadlineRequests._id": req._id },
      { $set: reqSet, $push: { activity: activity(user.id, "deadline_rejected", `Turned down the request to move the deadline to ${fmtShortDateTime(newIso)}. It stays ${fmtShortDateTime(oldIso)}.${noteText}`) } }
    );
  }
  await notifyDeadlineDecision(task, { oldDeadline: task.deadline, newDeadline: req.newDeadline }, user, requesterId, approve, cleanNote);
  revalidateAll();
  return { ok: true };
}

/** The person who asked (or an admin) takes a pending request back. */
export async function withdrawDeadlineRequest(taskId: string, requestId: string): Promise<ActionResult> {
  const user = await requireActor();
  if (!isValidId(taskId) || !isValidId(requestId)) return fail("Request not found.");
  await connectDB();
  const task = await Task.findById(taskId).lean();
  if (!task) return fail("Task not found.");
  const req = (task.deadlineRequests ?? []).find((r) => r._id.toString() === requestId);
  if (!req || req.status !== "pending") return fail("This request has already been decided.");
  if (req.requestedBy.toString() !== user.id && user.role !== "admin") return fail("Only the person who asked can withdraw this.");
  await Task.updateOne(
    { _id: task._id, "deadlineRequests._id": req._id },
    {
      $set: { "deadlineRequests.$.status": "withdrawn", "deadlineRequests.$.reviewedBy": oid(user.id), "deadlineRequests.$.reviewedAt": new Date() },
      $push: { activity: activity(user.id, "deadline_withdrawn", `Withdrew the request to move the deadline to ${fmtShortDateTime(new Date(req.newDeadline).toISOString())}.`) },
    }
  );
  revalidateAll();
  return { ok: true };
}

export async function setAssignees(taskId: string, userIds: string[]): Promise<ActionResult> {
  const user = await requireActor();
  const task = await loadEditableTask(taskId, user);
  if (typeof task === "string") return fail(task);
  const ids = userIds.filter(isValidId);
  if (ids.length === 0) return fail("A task needs at least one owner.");
  const users = await User.find({ _id: { $in: ids }, active: { $ne: false } }).select("name").lean();
  if (users.length !== ids.length) return fail("One of those people isn't available.");

  await Task.updateOne(
    { _id: task._id },
    {
      $set: { assignees: ids.map((i) => new Types.ObjectId(i)) },
      $push: { activity: activity(user.id, "assignees", `Owners are now ${users.map((u) => u.name).join(", ")}.`) },
    }
  );
  const added = ids.filter((id) => !task.assignees.some((a) => a.toString() === id));
  await notifyAssigned(task, added, user, users.map((u) => u.name));
  revalidateAll();
  return { ok: true };
}

export async function addSubtask(taskId: string, title: string): Promise<ActionResult> {
  const user = await requireActor();
  const task = await loadEditableTask(taskId, user);
  if (typeof task === "string") return fail(task);
  const t = title.trim();
  if (!t) return fail("Subtask needs a title.");
  await Task.updateOne(
    { _id: task._id },
    { $push: { subtasks: { title: t }, activity: activity(user.id, "subtask_added", `Added subtask "${t}".`) } }
  );
  revalidateAll();
  return { ok: true };
}

export async function toggleSubtask(taskId: string, subtaskId: string, done: boolean): Promise<ActionResult> {
  const user = await requireActor();
  const task = await loadEditableTask(taskId, user);
  if (typeof task === "string") return fail(task);
  if (!isValidId(subtaskId)) return fail("Subtask not found.");
  const sub = task.subtasks.find((s) => s._id.toString() === subtaskId);
  if (!sub) return fail("Subtask not found.");
  await Task.updateOne(
    { _id: task._id, "subtasks._id": new Types.ObjectId(subtaskId) },
    {
      $set: {
        "subtasks.$.isDone": done,
        "subtasks.$.completedAt": done ? new Date() : null,
        "subtasks.$.completedBy": done ? new Types.ObjectId(user.id) : null,
      },
      $push: { activity: activity(user.id, done ? "subtask_done" : "subtask_reopened", `${done ? "Completed" : "Reopened"} subtask "${sub.title}".`) },
    }
  );
  revalidateAll();
  return { ok: true };
}

export async function removeSubtask(taskId: string, subtaskId: string): Promise<ActionResult> {
  const user = await requireActor();
  const task = await loadEditableTask(taskId, user);
  if (typeof task === "string") return fail(task);
  const sub = task.subtasks.find((s) => s._id.toString() === subtaskId);
  if (!sub) return fail("Subtask not found.");
  await Task.updateOne(
    { _id: task._id },
    { $pull: { subtasks: { _id: sub._id } }, $push: { activity: activity(user.id, "subtask_removed", `Removed subtask "${sub.title}".`) } }
  );
  revalidateAll();
  return { ok: true };
}

export async function addComment(taskId: string, body: string): Promise<ActionResult> {
  const user = await requireActor();
  if (!isValidId(taskId)) return fail("Task not found.");
  const text = body.trim();
  if (!text) return fail("Write something first.");
  if (text.length > 2000) return fail("Comment is too long.");
  await connectDB();
  const res = await Task.updateOne(
    { _id: new Types.ObjectId(taskId) },
    { $push: { comments: { userId: new Types.ObjectId(user.id), body: text }, activity: activity(user.id, "comment", "Left a comment.") } }
  );
  if (res.matchedCount === 0) return fail("Task not found.");
  revalidateAll();
  return { ok: true };
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const user = await requireActor();
  if (!isValidId(taskId)) return fail("Task not found.");
  await connectDB();
  const task = await Task.findById(taskId).lean();
  if (!task) return fail("Task not found.");
  if (user.role !== "admin" && task.createdBy.toString() !== user.id) return fail("Only the creator or an admin can delete a task.");
  await Task.deleteOne({ _id: task._id });
  await Task.updateMany({ parentId: task._id }, { $set: { parentId: null } }); // dependencies live on as ordinary tasks
  revalidateAll();
  redirect("/tasks");
}

/* ---------------- dependencies ---------------- */

export type CreateResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Adds a dependency: a real task, owned by other people with its own deadline, that feeds this one.
 * It shows up for its owners like any other task and counts in their ownership score the same way.
 */
export async function createDependency(
  parentId: string,
  input: { title: string; description: string; deadline: string; assigneeIds: string[] }
): Promise<CreateResult> {
  const user = await requireActor();
  const parent = await loadEditableTask(parentId, user);
  if (typeof parent === "string") return { ok: false, error: parent };
  if (parent.status === "done") return { ok: false, error: "This task is already done, so it can't take new dependencies." };
  const title = input.title.trim();
  if (title.length < 2) return { ok: false, error: "Give the dependency a title." };
  if (title.length > 200) return { ok: false, error: "Title is too long (200 characters max)." };
  const deadline = parseDeadline(input.deadline);
  if (!deadline) return { ok: false, error: "Pick a deadline for it." };
  if (deadline.getTime() > new Date(parent.deadline).getTime()) {
    return { ok: false, error: `A dependency has to land before the task it feeds. Pick a time on or before ${fmtShortDateTime(new Date(parent.deadline).toISOString())}.` };
  }
  const ids = [...new Set(input.assigneeIds.filter(isValidId))];
  if (ids.length === 0) return { ok: false, error: "Pick at least one person to own it." };
  const owners = await User.find({ _id: { $in: ids }, active: { $ne: false } }).select("name").lean();
  if (owners.length !== ids.length) return { ok: false, error: "One of those people isn't available." };
  const names = owners.map((u) => u.name);

  const created = await Task.create({
    title,
    description: input.description.trim(),
    priority: parent.priority,
    status: "todo",
    deadline,
    originalDeadline: deadline,
    createdBy: oid(user.id),
    parentId: parent._id,
    assignees: ids.map(oid),
    tags: [],
    activity: [activity(user.id, "created", `Created this as a dependency of "${parent.title}" and assigned it to ${names.join(", ")}. Deadline ${fmtShortDateTime(deadline.toISOString())}.`)],
  });
  await Task.updateOne(
    { _id: parent._id },
    { $push: { activity: activity(user.id, "dependency_added", `Added dependency "${title}" for ${names.join(", ")}, due ${fmtShortDateTime(deadline.toISOString())}.`) } }
  );
  await notifyAssigned(created, ids, user, names);
  revalidateAll();
  return { ok: true, id: created._id.toString() };
}

/* ---------------- integrity flags ---------------- */

/**
 * Admin or the owner's team owner says a task was marked done without the work being done.
 * The task is reopened, the flag is logged, and it costs the owners score until it's cleared.
 */
export async function flagTask(taskId: string, reason: string): Promise<ActionResult> {
  const user = await requireActor();
  if (!isValidId(taskId)) return fail("Task not found.");
  const trimmed = reason.trim();
  if (trimmed.length < 5) return fail("Say what's missing (at least 5 characters). The owner will see it.");
  await connectDB();
  const task = await Task.findById(taskId).lean();
  if (!task) return fail("Task not found.");
  if (task.status !== "done") return fail("Only a task that's marked done can be flagged.");
  if ((task.flags ?? []).some((f) => !f.clearedAt)) return fail("This task is already flagged.");
  const teams = (await Team.find({}).lean()).map(toTeamDTO);
  const assigneeIds = task.assignees.map((a) => a.toString());
  if (!canFlag(user, { assignees: assigneeIds }, teams)) return fail("Only an admin or the owner's team owner can flag this, and never on their own task.");

  await Task.updateOne(
    { _id: task._id },
    {
      $set: { status: "in_progress", completedAt: null, completedBy: null },
      $push: {
        flags: { by: oid(user.id), reason: trimmed },
        activity: activity(user.id, "flagged", `Flagged this as marked done without the work being done, and reopened it. Reason: ${trimmed}`),
      },
    }
  );
  await notifyFlagged(task, assigneeIds, user, trimmed);
  revalidateAll();
  return { ok: true };
}

/** Lifts a flag (admin or team owner), e.g. once the work really is done or the flag was a mistake. */
export async function clearFlag(taskId: string, flagId: string, note = ""): Promise<ActionResult> {
  const user = await requireActor();
  if (!isValidId(taskId) || !isValidId(flagId)) return fail("Flag not found.");
  await connectDB();
  const task = await Task.findById(taskId).lean();
  if (!task) return fail("Task not found.");
  const flag = (task.flags ?? []).find((f) => f._id.toString() === flagId);
  if (!flag || flag.clearedAt) return fail("That flag is already cleared.");
  const teams = (await Team.find({}).lean()).map(toTeamDTO);
  if (!canFlag(user, { assignees: task.assignees.map((a) => a.toString()) }, teams)) return fail("Only an admin or the owner's team owner can clear this.");
  const cleanNote = note.trim().slice(0, 300);
  await Task.updateOne(
    { _id: task._id, "flags._id": flag._id },
    {
      $set: { "flags.$.clearedBy": oid(user.id), "flags.$.clearedAt": new Date(), "flags.$.clearNote": cleanNote },
      $push: { activity: activity(user.id, "flag_cleared", `Cleared the flag.${cleanNote ? ` Note: ${cleanNote}` : ""}`) },
    }
  );
  revalidateAll();
  return { ok: true };
}

/* ---------------- admin: people ---------------- */

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  if (actor.role !== "admin") return { error: "Admins only." };
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const title = String(formData.get("title") ?? "").trim();
  const role = (String(formData.get("role") ?? "member") as Role) === "admin" ? "admin" : "member";
  const onboarding = String(formData.get("onboarding") ?? "invite") === "temp" ? "temp" : "invite";
  const password = String(formData.get("password") ?? "");
  const teamIds = formData.getAll("teams").map(String).filter(isValidId);
  if (name.length < 2) return { error: "Enter the person's name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email." };
  if (onboarding === "temp" && password.length < 6) return { error: "Temporary password needs at least 6 characters." };

  await connectDB();
  if (await User.exists({ email })) return { error: "Someone with that email already exists." };
  const count = await User.countDocuments();
  const created = await User.create({
    name, email, title, role,
    passwordHash: onboarding === "temp" ? await bcrypt.hash(password, 10) : "",
    mustChangePassword: onboarding === "temp",
    color: AVATAR_COLORS[count % AVATAR_COLORS.length],
  });
  if (teamIds.length > 0) await Team.updateMany({ _id: { $in: teamIds } }, { $addToSet: { members: created._id } });
  const base = await appUrl();

  if (onboarding === "invite") {
    const raw = await issueToken(created._id.toString(), "invite", INVITE_TTL_MS);
    const link = `${base}/invite/${raw}`;
    const r = await sendMail({ to: email, ...inviteEmail({ name, inviterName: actor.name, link, days: 7 }) });
    revalidateAll();
    if (!r.ok) return { message: `${name} was added, but the invite email failed (${r.error}). Share this link with them instead; it works for 7 days.`, link, delivered: false };
    if (!r.delivered) return { message: `${name} was added. Email isn't set up yet, so share this invite link with them yourself; it works for 7 days.`, link, delivered: false };
    return { message: `Invite sent to ${email}. The link works for 7 days.`, link, delivered: true };
  }

  const r = await sendMail({ to: email, ...tempPasswordEmail({ name, email, tempPassword: password, loginUrl: `${base}/login`, byName: actor.name, reason: "created" }) });
  revalidateAll();
  if (!r.ok) return { message: `${name} was added, but the email failed (${r.error}). Share the temporary password with them yourself; they'll be asked to change it on first sign-in.`, delivered: false };
  if (!r.delivered) return { message: `${name} was added. Email isn't set up yet, so share the temporary password with them yourself; they'll be asked to change it on first sign-in.`, delivered: false };
  return { message: `Account created. The temporary password was emailed to ${email}; they'll be asked to change it on first sign-in.`, delivered: true };
}

export async function setUserRole(userId: string, role: Role): Promise<ActionResult> {
  const actor = await requireActor();
  if (actor.role !== "admin") return fail("Admins only.");
  if (actor.id === userId) return fail("You can't change your own role.");
  if (!isValidId(userId)) return fail("User not found.");
  await connectDB();
  await User.updateOne({ _id: userId }, { $set: { role: role === "admin" ? "admin" : "member" } });
  revalidateAll();
  return { ok: true };
}

export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  const actor = await requireActor();
  if (actor.role !== "admin") return fail("Admins only.");
  if (actor.id === userId) return fail("You can't deactivate yourself.");
  if (!isValidId(userId)) return fail("User not found.");
  await connectDB();
  await User.updateOne({ _id: userId }, { $set: { active } });
  revalidateAll();
  return { ok: true };
}

export type ResetResult = { ok: true; delivered: boolean; configured: boolean } | { ok: false; error: string };

/** Admin sets a temporary password for someone; they must change it on their next sign-in. */
export async function resetPassword(userId: string, password: string, notify = true): Promise<ResetResult> {
  const actor = await requireActor();
  if (actor.role !== "admin") return { ok: false, error: "Admins only." };
  if (password.length < 6) return { ok: false, error: "Password needs at least 6 characters." };
  if (!isValidId(userId)) return { ok: false, error: "User not found." };
  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) return { ok: false, error: "User not found." };
  const self = actor.id === userId;
  await User.updateOne({ _id: userId }, { $set: { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: !self } });
  revalidateAll();
  if (self || !notify) return { ok: true, delivered: false, configured: mailConfigured() };
  const r = await sendMail({ to: user.email, ...tempPasswordEmail({ name: user.name, email: user.email, tempPassword: password, loginUrl: `${await appUrl()}/login`, byName: actor.name, reason: "reset" }) });
  if (!r.ok) return { ok: false, error: `Password was changed, but the email failed: ${r.error}` };
  return { ok: true, delivered: r.delivered, configured: mailConfigured() };
}

/* ---------------- teams ---------------- */

export async function createTeam(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  if (actor.role !== "admin") return { error: "Admins only." };
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const ownerRaw = String(formData.get("owner") ?? "");
  const owner = isValidId(ownerRaw) ? ownerRaw : null;
  const members = new Set(formData.getAll("members").map(String).filter(isValidId));
  if (owner) members.add(owner);
  if (name.length < 2) return { error: "Give the team a name." };

  await connectDB();
  if (await Team.exists({ name: new RegExp(`^${escapeRegex(name)}$`, "i") })) return { error: "A team with that name already exists." };
  if (owner && !(await User.exists({ _id: owner, active: { $ne: false } }))) return { error: "That owner isn't available." };
  const count = await Team.countDocuments();
  const team = await Team.create({
    name, description,
    color: isHexColor(color) ? color : AVATAR_COLORS[count % AVATAR_COLORS.length],
    owner: owner ? oid(owner) : null,
    members: [...members].map(oid),
  });
  revalidateAll();
  redirect(`/admin/teams/${team._id.toString()}`);
}

/** Edits name, description, colour and owner. The owner is always kept in the member list. */
export async function updateTeam(teamId: string, name: string, description: string, color: string, ownerId: string | null = null): Promise<ActionResult> {
  const actor = await requireActor();
  if (actor.role !== "admin") return fail("Admins only.");
  if (!isValidId(teamId)) return fail("Team not found.");
  const cleanName = name.trim();
  if (cleanName.length < 2) return fail("Give the team a name.");
  const owner = ownerId && isValidId(ownerId) ? ownerId : null;
  await connectDB();
  if (await Team.exists({ _id: { $ne: teamId }, name: new RegExp(`^${escapeRegex(cleanName)}$`, "i") })) return fail("A team with that name already exists.");
  if (owner && !(await User.exists({ _id: owner, active: { $ne: false } }))) return fail("That owner isn't available.");
  const update: Record<string, unknown> = { name: cleanName, description: description.trim(), owner: owner ? oid(owner) : null };
  if (isHexColor(color)) update.color = color;
  await Team.updateOne({ _id: teamId }, owner ? { $set: update, $addToSet: { members: oid(owner) } } : { $set: update });
  revalidateAll();
  return { ok: true };
}

export async function setTeamMembers(teamId: string, userIds: string[]): Promise<ActionResult> {
  const actor = await requireActor();
  if (actor.role !== "admin") return fail("Admins only.");
  if (!isValidId(teamId)) return fail("Team not found.");
  await connectDB();
  const team = await Team.findById(teamId).lean();
  if (!team) return fail("Team not found.");
  const valid = await User.find({ _id: { $in: userIds.filter(isValidId) } }).select("_id").lean();
  const ids = valid.map((u) => u._id);
  if (team.owner && !ids.some((i) => i.equals(team.owner!))) ids.push(team.owner); // the owner always stays a member
  await Team.updateOne({ _id: teamId }, { $set: { members: ids } });
  revalidateAll();
  return { ok: true };
}

export async function deleteTeam(teamId: string): Promise<ActionResult> {
  const actor = await requireActor();
  if (actor.role !== "admin") return fail("Admins only.");
  if (!isValidId(teamId)) return fail("Team not found.");
  await connectDB();
  await Team.deleteOne({ _id: teamId });
  revalidateAll();
  return { ok: true };
}
