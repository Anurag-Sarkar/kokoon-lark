import { requireUser } from "@/lib/auth";
import { listTasksWithPendingRequests, listTeams } from "@/lib/queries";
import { canReview, isTeamOwner, pendingDeadlineRequest } from "@/lib/approvals";
import { Sidebar } from "@/components/shell/Sidebar";
import { RefreshOnReturn } from "@/components/shell/RefreshOnReturn";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Pages enforce the forced password change themselves, so /account can render inside the shell.
  const user = await requireUser({ allowPasswordChange: true });
  const teams = await listTeams();
  const show = user.role === "admin" || isTeamOwner(user.id, teams);
  let count = 0;
  if (show) {
    const pending = await listTasksWithPendingRequests();
    count = pending.filter((t) => { const r = pendingDeadlineRequest(t); return !!r && canReview(user, r.requestedBy, teams); }).length;
  }
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
      <RefreshOnReturn />
      <Sidebar user={user} approvals={{ show, count }} />
      <main className="min-w-0 w-full">
        <div className="mx-auto w-full max-w-[1380px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
