import Link from "next/link";
import { peekToken } from "@/lib/tokens";
import { getUser } from "@/lib/queries";
import { AuthShell } from "@/components/auth/AuthShell";
import { SetPasswordForm } from "@/components/auth/AuthForms";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await peekToken(token, "invite");
  const user = t ? await getUser(t.userId) : null;
  if (!t || !user) {
    return (
      <AuthShell title="This invite isn't valid any more" subtitle="Invite links work for 7 days and can only be used once. Ask your admin to send a new one." footer={<Link href="/login" className="text-accent-deep hover:underline">Back to sign in</Link>}>
        <div className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-2">Already set your password? <Link href="/login" className="text-accent-deep hover:underline">Sign in</Link> instead.</div>
      </AuthShell>
    );
  }
  return (
    <AuthShell title={`Welcome, ${user.name.split(" ")[0]}`} subtitle={<>Choose a password for <span className="font-medium text-ink">{user.email}</span> and you're in.</>}>
      <SetPasswordForm token={token} mode="invite" />
    </AuthShell>
  );
}
