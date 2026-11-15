import { requireAdmin } from "@/lib/auth";
import { listTeams, listUsers } from "@/lib/queries";
import { PageHeader } from "@/components/shell/PageHeader";
import { PeopleManager } from "@/components/admin/PeopleManager";

export default async function PeoplePage() {
  const admin = await requireAdmin();
  const [users, teams] = await Promise.all([listUsers({ includeInactive: true }), listTeams()]);
  return (
    <div>
      <PageHeader title="People" subtitle="Add teammates, set roles, reset passwords. Deactivated people keep their history but can't sign in." />
      <PeopleManager users={users} teams={teams} currentUserId={admin.id} />
    </div>
  );
}
