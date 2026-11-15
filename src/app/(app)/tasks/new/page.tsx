import { addDays, setHours, setMinutes } from "date-fns";
import { requireUser } from "@/lib/auth";
import { listUsers } from "@/lib/queries";
import { toDatetimeLocal } from "@/lib/format";
import { PageHeader } from "@/components/shell/PageHeader";
import { NewTaskForm } from "@/components/tasks/NewTaskForm";

export default async function NewTaskPage() {
  const user = await requireUser();
  const users = await listUsers();
  const def = setMinutes(setHours(addDays(new Date(), 3), 17), 0);
  return (
    <div>
      <PageHeader title="New task" subtitle="Give it a clear title, a real deadline, and at least one owner." />
      <NewTaskForm users={users} defaultDeadline={toDatetimeLocal(def.toISOString())} currentUserId={user.id} />
    </div>
  );
}
