import Link from "next/link";
import { peekToken } from "@/lib/tokens";
import { getUser } from "@/lib/queries";
import { AuthShell } from "@/components/auth/AuthShell";
import { SetPasswordForm } from "@/components/auth/AuthForms";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await peekToken(token, "reset");
  const user = t ? await getUser(t.userId) : null;
  if (!t || !user) {
    return (
      <AuthShell title="This link has expired" subtitle="Reset links work for 60 minutes and can only be used once." footer={<Link href="/login" className="text-accent-deep hover:underline">Back to sign in</Link>}>
        <Link href="/forgot-password" className="btn btn-primary h-10 w-full">Request a new link</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Choose a new password" subtitle={<>For <span className="font-medium text-ink">{user.email}</span></>}>
      <SetPasswordForm token={token} mode="reset" />
    </AuthShell>
  );
}
