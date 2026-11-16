import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models";
import { allowedDomainsLabel, signupDisabled } from "@/lib/signupPolicy";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/AuthForms";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  await connectDB();
  const first = (await User.countDocuments()) === 0;
  if (!first && signupDisabled()) {
    return (
      <AuthShell title="Sign-ups are by invite" subtitle="This workspace only takes invited people. Ask an admin to add you and you'll get an email with a link to set your password." footer={<Link href="/login" className="text-accent-deep hover:underline">Back to sign in</Link>}>
        <div className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-2">Already have an invite? Open the link in that email.</div>
      </AuthShell>
    );
  }
  const domains = allowedDomainsLabel();
  return (
    <AuthShell
      title={first ? "Set up your workspace" : "Create your account"}
      subtitle={first
        ? "You'll be the first admin. You can invite everyone else from People once you're in."
        : `Join your team on Kokoon Task. Once you're in, an admin can add you to a team and anyone can assign you tasks.${domains ? ` Use your ${domains} email.` : ""}`}
      footer={<Link href="/login" className="text-accent-deep hover:underline">Already have an account? Sign in</Link>}
    >
      <SignupForm first={first} />
    </AuthShell>
  );
}
