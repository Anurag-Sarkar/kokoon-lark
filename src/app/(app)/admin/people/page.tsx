import { requireAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { PeopleManager } from "@/components/admin/PeopleManager";

export default async function PeoplePage() {
  const admin = await requireAdmin();
  const users = await listUsers({ includeInactive: true });
  return (
    <div>
      <PageHeader title="People" subtitle="Add teammates, set roles, reset passwords. Deactivated people keep their history but can't sign in." />
      <PeopleManager users={users} currentUserId={admin.id} />
    </div>
  );
}
