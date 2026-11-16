import { Types } from "mongoose";
import { connectDB } from "./mongodb";
import { Task, Team, User } from "./models";
import { toTaskDTO, toTeamDTO, toUserDTO } from "./serialize";
import type { TaskDTO, TeamDTO, UserDTO } from "./types";

export const isValidId = (id: string): boolean => Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === id;

export async function listUsers(opts: { includeInactive?: boolean } = {}): Promise<UserDTO[]> {
  await connectDB();
  const filter = opts.includeInactive ? {} : { active: { $ne: false } };
  const users = await User.find(filter).sort({ name: 1 }).lean();
  return users.map(toUserDTO);
}

export async function getUser(id: string): Promise<UserDTO | null> {
  if (!isValidId(id)) return null;
  await connectDB();
  const u = await User.findById(id).lean();
  return u ? toUserDTO(u) : null;
}

export async function listTeams(): Promise<TeamDTO[]> {
  await connectDB();
  const teams = await Team.find({}).sort({ name: 1 }).lean();
  return teams.map(toTeamDTO);
}

export async function getTeam(id: string): Promise<TeamDTO | null> {
  if (!isValidId(id)) return null;
  await connectDB();
  const t = await Team.findById(id).lean();
  return t ? toTeamDTO(t) : null;
}

export async function listAllTasks(): Promise<TaskDTO[]> {
  await connectDB();
  const tasks = await Task.find({}).sort({ deadline: 1 }).lean();
  return tasks.map(toTaskDTO);
}

export async function listTasksForUser(userId: string): Promise<TaskDTO[]> {
  await connectDB();
  const oid = new Types.ObjectId(userId);
  const tasks = await Task.find({ $or: [{ assignees: oid }, { createdBy: oid }] })
    .sort({ deadline: 1 })
    .lean();
  return tasks.map(toTaskDTO);
}

/** Tasks with a deadline change waiting for review. */
export async function listTasksWithPendingRequests(): Promise<TaskDTO[]> {
  await connectDB();
  const tasks = await Task.find({ "deadlineRequests.status": "pending" }).sort({ deadline: 1 }).lean();
  return tasks.map(toTaskDTO);
}

export async function getTask(id: string): Promise<TaskDTO | null> {
  if (!isValidId(id)) return null;
  await connectDB();
  const t = await Task.findById(id).lean();
  return t ? toTaskDTO(t) : null;
}

export function userMap(users: UserDTO[]): Map<string, UserDTO> {
  return new Map(users.map((u) => [u.id, u]));
}
