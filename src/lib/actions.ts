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
import { notifyAssigned } from "./notify";
import { connectDB } from "./mongodb";
import { Task, Team, User, type TaskDoc } from "./models";
import { isValidId } from "./queries";
import { PRIORITIES, STATUSES, STATUS_LABEL, type ActionResult, type ActivityType, type Priority, type Role, type Status, type UserDTO } from "./types";
import { fmtShortDateTime, shiftLabel } from "./format";

const AVATAR_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];

/* ---------------- helpers ---------------- */

function fail(error: string): ActionResult {
  return { ok: false, error };
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isHexColor = (s: string) => /^#[0-9a-f]{6}$/i.test(s);

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

export async function changeDeadline(taskId: string, newDeadlineRaw: string, reason: string): Promise<ActionResult> {
  const user = await requireActor();
  const task = await loadEditableTask(taskId, user);
  if (typeof task === "string") return fail(task);
  const newDeadline = parseDeadline(newDeadlineRaw);
  if (!newDeadline) return fail("Pick a valid date and time.");
  const trimmed = reason.trim();
  if (trimmed.length < 5) return fail("Give a real reason (at least 5 characters). It will be visible to the team.");
  if (newDeadline.getTime() === new Date(task.deadline).getTime()) return fail("That's already the deadline.");

  const oldIso = new Date(task.deadline).toISOString();
  const newIso = newDeadline.toISOString();
  await Task.updateOne(
    { _id: task._id },
    {
      $set: { deadline: newDeadline },
      $push: {
        deadlineChanges: { oldDeadline: task.deadline, newDeadline, reason: trimmed, changedBy: new Types.ObjectId(user.id) },
        activity: activity(user.id, "deadline", `Deadline ${shiftLabel(oldIso, newIso)}: ${fmtShortDateTime(oldIso)} → ${fmtShortDateTime(newIso)}. Reason: ${trimmed}`),
      },
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
  revalidateAll();
  redirect("/tasks");
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
  const members = formData.getAll("members").map(String).filter(isValidId);
  if (name.length < 2) return { error: "Give the team a name." };

  await connectDB();
  if (await Team.exists({ name: new RegExp(`^${escapeRegex(name)}$`, "i") })) return { error: "A team with that name already exists." };
  const count = await Team.countDocuments();
  const team = await Team.create({
    name, description,
    color: isHexColor(color) ? color : AVATAR_COLORS[count % AVATAR_COLORS.length],
    members: members.map((m) => new Types.ObjectId(m)),
  });
  revalidateAll();
  redirect(`/admin/teams/${team._id.toString()}`);
}

export async function updateTeam(teamId: string, name: string, description: string, color: string): Promise<ActionResult> {
  const actor = await requireActor();
  if (actor.role !== "admin") return fail("Admins only.");
  if (!isValidId(teamId)) return fail("Team not found.");
  const cleanName = name.trim();
  if (cleanName.length < 2) return fail("Give the team a name.");
  await connectDB();
  if (await Team.exists({ _id: { $ne: teamId }, name: new RegExp(`^${escapeRegex(cleanName)}$`, "i") })) return fail("A team with that name already exists.");
  const update: Record<string, string> = { name: cleanName, description: description.trim() };
  if (isHexColor(color)) update.color = color;
  await Team.updateOne({ _id: teamId }, { $set: update });
  revalidateAll();
  return { ok: true };
}

export async function setTeamMembers(teamId: string, userIds: string[]): Promise<ActionResult> {
  const actor = await requireActor();
  if (actor.role !== "admin") return fail("Admins only.");
  if (!isValidId(teamId)) return fail("Team not found.");
  await connectDB();
  const valid = await User.find({ _id: { $in: userIds.filter(isValidId) } }).select("_id").lean();
  await Team.updateOne({ _id: teamId }, { $set: { members: valid.map((u) => u._id) } });
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
