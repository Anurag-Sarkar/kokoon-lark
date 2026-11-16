import { Types } from "mongoose";
import { connectDB } from "./mongodb";
import { User, type TaskDoc } from "./models";
import { appUrl, sendMail } from "./mail";
import { assignedEmail } from "./emails";
import { fmtShortDateTime } from "./format";
import { PRIORITY_LABEL } from "./types";

/** Emails everyone newly assigned to a task (never the person doing the assigning). Never throws. */
export async function notifyAssigned(
  task: Pick<TaskDoc, "_id" | "title" | "deadline" | "priority">,
  newAssigneeIds: string[],
  actor: { id: string; name: string },
  allOwnerNames: string[]
): Promise<void> {
  const targets = newAssigneeIds.filter((id) => id !== actor.id);
  if (targets.length === 0) return;
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
