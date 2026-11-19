import { Types } from "mongoose";
import { connectDB } from "./mongodb";
import { User, type TaskDoc } from "./models";
import { appUrl, sendMail } from "./mail";
import { assignedEmail, deadlineDecisionEmail, deadlineRequestEmail, dependencyEmail, flaggedEmail } from "./emails";
import { fmtShortDateTime, shiftLabel } from "./format";
import { PRIORITY_LABEL } from "./types";
import { sendPush } from "./push";

/** Emails and pushes everyone newly assigned to a task (never the person doing the assigning). Never throws. */
export async function notifyAssigned(
  task: Pick<TaskDoc, "_id" | "title" | "deadline" | "priority">,
  newAssigneeIds: string[],
  actor: { id: string; name: string },
  allOwnerNames: string[]
): Promise<void> {
  const targets = newAssigneeIds.filter((id) => id !== actor.id);
  if (targets.length === 0) return;
  const deadlineLabel = fmtShortDateTime(new Date(task.deadline).toISOString());
  await sendPush(targets, { title: `${actor.name} assigned you a task`, body: `${task.title} · due ${deadlineLabel}`, url: `/tasks/${task._id.toString()}`, tag: `task-${task._id.toString()}` });
  try {
    await connectDB();
    const users = await User.find({
      _id: { $in: targets.map((t) => new Types.ObjectId(t)) },
      active: { $ne: false },
      emailNotifications: { $ne: false },
    }).select("name email").lean();
    if (users.length === 0) return;
    const link = `${await appUrl()}/tasks/${task._id.toString()}`;
    await Promise.allSettled(
      users.map((u) =>
        sendMail({
          to: u.email,
          ...assignedEmail({
            name: u.name,
            taskTitle: task.title,
            byName: actor.name,
            deadlineLabel: fmtShortDateTime(new Date(task.deadline).toISOString()),
            priorityLabel: PRIORITY_LABEL[task.priority],
            link,
            coOwners: allOwnerNames.filter((n) => n !== u.name),
          }),
        })
      )
    );
  } catch (err) {
    console.error("[notify] assignment emails failed:", err);
  }
}

/** Tells the people a dependency was assigned to, naming the task that is waiting on them. Never throws. */
export async function notifyDependency(
  child: Pick<TaskDoc, "_id" | "title" | "deadline">,
  parent: Pick<TaskDoc, "_id" | "title" | "deadline">,
  assigneeIds: string[],
  actor: { id: string; name: string },
  allOwnerNames: string[]
): Promise<void> {
  const targets = assigneeIds.filter((id) => id !== actor.id);
  if (targets.length === 0) return;
  const path = `/tasks/${child._id.toString()}`;
  const deadlineLabel = fmtShortDateTime(new Date(child.deadline).toISOString());
  await sendPush(targets, {
    title: `${actor.name} needs something from you`,
    body: `${child.title} · needed by ${deadlineLabel} for "${parent.title}"`,
    url: path,
    tag: `task-${child._id.toString()}`,
  });
  try {
    const users = await mailableUsers(targets, actor.id);
    if (users.length === 0) return;
    const link = `${await appUrl()}${path}`;
    await Promise.allSettled(
      users.map((u) =>
        sendMail({
          to: u.email,
          ...dependencyEmail({
            name: u.name, byName: actor.name, taskTitle: child.title, parentTitle: parent.title,
            deadlineLabel, parentDeadlineLabel: fmtShortDateTime(new Date(parent.deadline).toISOString()),
            link, coOwners: allOwnerNames.filter((n) => n !== u.name),
          }),
        })
      )
    );
  } catch (err) {
    console.error("[notify] dependency emails failed:", err);
  }
}

async function mailableUsers(ids: string[], exceptId: string) {
  const targets = ids.filter((id) => id !== exceptId);
  if (targets.length === 0) return [];
  await connectDB();
  return User.find({
    _id: { $in: targets.map((t) => new Types.ObjectId(t)) },
    active: { $ne: false },
    emailNotifications: { $ne: false },
  }).select("name email").lean();
}

/** Emails and pushes everyone who can approve a deadline request. Never throws. */
export async function notifyDeadlineRequest(
  task: Pick<TaskDoc, "_id" | "title">,
  req: { oldDeadline: Date; newDeadline: Date; reason: string },
  requester: { id: string; name: string },
  reviewerIds: string[]
): Promise<void> {
  const oldIso = new Date(req.oldDeadline).toISOString();
  const newIso = new Date(req.newDeadline).toISOString();
  const path = `/tasks/${task._id.toString()}`;
  await sendPush(reviewerIds.filter((id) => id !== requester.id), {
    title: `${requester.name} wants to move a deadline`,
    body: `${task.title}: ${fmtShortDateTime(oldIso)} → ${fmtShortDateTime(newIso)}. Tap to approve or turn down.`,
    url: path,
    tag: `deadline-${task._id.toString()}`,
  });
  try {
    const users = await mailableUsers(reviewerIds, requester.id);
    if (users.length === 0) return;
    const link = `${await appUrl()}${path}`;
    await Promise.allSettled(
      users.map((u) =>
        sendMail({
          to: u.email,
          ...deadlineRequestEmail({
            name: u.name, requesterName: requester.name, taskTitle: task.title,
            oldLabel: fmtShortDateTime(oldIso), newLabel: fmtShortDateTime(newIso), shift: shiftLabel(oldIso, newIso),
            reason: req.reason, link,
          }),
        })
      )
    );
  } catch (err) {
    console.error("[notify] deadline request emails failed:", err);
  }
}

/** Tells the requester how their deadline request was decided, by push and email. Never throws. */
export async function notifyDeadlineDecision(
  task: Pick<TaskDoc, "_id" | "title">,
  req: { oldDeadline: Date; newDeadline: Date },
  reviewer: { id: string; name: string },
  requesterId: string,
  approved: boolean,
  note: string
): Promise<void> {
  const path = `/tasks/${task._id.toString()}`;
  const newLabel = fmtShortDateTime(new Date(req.newDeadline).toISOString());
  const oldLabel = fmtShortDateTime(new Date(req.oldDeadline).toISOString());
  if (requesterId !== reviewer.id) {
    await sendPush([requesterId], {
      title: approved ? `${reviewer.name} approved your deadline change` : `${reviewer.name} turned down your deadline change`,
      body: `${task.title} ${approved ? `is now due ${newLabel}` : `stays due ${oldLabel}`}${note ? ` · ${note}` : ""}`,
      url: path,
      tag: `deadline-${task._id.toString()}`,
    });
  }
  try {
    const users = await mailableUsers([requesterId], reviewer.id);
    if (users.length === 0) return;
    const link = `${await appUrl()}${path}`;
    const u = users[0]!;
    await sendMail({
      to: u.email,
      ...deadlineDecisionEmail({
        name: u.name, reviewerName: reviewer.name, taskTitle: task.title, approved,
        oldLabel: fmtShortDateTime(new Date(req.oldDeadline).toISOString()),
        newLabel: fmtShortDateTime(new Date(req.newDeadline).toISOString()),
        note, link,
      }),
    });
  } catch (err) {
    console.error("[notify] deadline decision email failed:", err);
  }
}

/** Tells a task's owners it was flagged as "marked done but not done" and reopened. Never throws. */
export async function notifyFlagged(task: Pick<TaskDoc, "_id" | "title">, ownerIds: string[], actor: { id: string; name: string }, reason: string): Promise<void> {
  const path = `/tasks/${task._id.toString()}`;
  await sendPush(ownerIds.filter((id) => id !== actor.id), {
    title: `${actor.name} flagged a task you marked done`,
    body: `${task.title} was reopened. ${reason}`,
    url: path,
    tag: `flag-${task._id.toString()}`,
  });
  try {
    const users = await mailableUsers(ownerIds, actor.id);
    if (users.length === 0) return;
    const link = `${await appUrl()}${path}`;
    await Promise.allSettled(users.map((u) => sendMail({ to: u.email, ...flaggedEmail({ name: u.name, byName: actor.name, taskTitle: task.title, reason, link }) })));
  } catch (err) {
    console.error("[notify] flag emails failed:", err);
  }
}
