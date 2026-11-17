import { ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listTeams } from "@/lib/queries";
import { teamsOf } from "@/lib/teams";
import { PageHeader } from "@/components/shell/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { ChangePasswordForm, NotificationsToggle } from "@/components/auth/AuthForms";
import { PushToggle } from "@/components/auth/PushToggle";
import { pushConfigured } from "@/lib/push";

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser({ allowPasswordChange: true });
  const forced = user.mustChangePassword || sp.change === "required";
  const teams = teamsOf(user.id, await listTeams());

  return (
    <div className="grid grid-cols-1 gap-6 max-w-3xl">
      <PageHeader title="Account" subtitle="Your sign-in details and how you want to be notified." />

      {forced && (
        <div className="flex items-start gap-3 rounded-xl border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn-text">
          <ShieldAlert className="size-4 mt-0.5 shrink-0" />
          <span>You signed in with a temporary password. Choose your own password to continue to the app.</span>
        </div>
      )}

      <section className="card p-5 flex items-center gap-4">
        <Avatar user={user} size="xl" />
        <div className="min-w-0">
          <div className="text-base font-semibold truncate">{user.name}</div>
          <div className="text-sm text-ink-2 truncate">{user.email}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
            <span>{user.role === "admin" ? "Admin" : user.title || "Member"}</span>
            {teams.map((t) => <span key={t.id} className="pill h-5 text-[11px] bg-surface-2 text-ink-2 gap-1"><span className="size-1.5 rounded-full" style={{ backgroundColor: t.color }} aria-hidden />{t.name}</span>)}
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold mb-1">Password</h2>
        <p className="text-xs text-ink-3 mb-4">{forced ? "Pick something only you know. At least 8 characters." : "Changing it keeps you signed in on this device."}</p>
        <ChangePasswordForm required={user.mustChangePassword} hasPassword={user.hasPassword} />
      </section>

      {!user.mustChangePassword && (
        <section className="card p-5 grid gap-5">
          <div>
            <h2 className="text-sm font-semibold mb-1">Email notifications</h2>
            <p className="text-xs text-ink-3 mb-3">Get an email when a task is assigned to you, when a deadline change needs your approval or yours is decided, and as a reminder two days before and on the morning a task of yours is due. Invites and password emails are always sent.</p>
            <NotificationsToggle enabled={user.emailNotifications} />
          </div>
          <div className="border-t border-line pt-5">
            <h2 className="text-sm font-semibold mb-1">Push notifications</h2>
            <p className="text-xs text-ink-3 mb-3">The same alerts as a notification on this phone or computer, even when the app is closed. Turn it on separately on each device you use. On iPhone, install the app to your Home Screen first.</p>
            <PushToggle configured={pushConfigured()} />
          </div>
        </section>
      )}
    </div>
  );
}
