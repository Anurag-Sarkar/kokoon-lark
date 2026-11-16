import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  let empty = false;
  try {
    await connectDB();
    empty = (await User.countDocuments()) === 0;
  } catch {
    /* login form still renders; the action reports the DB error */
  }
  return (
    <main className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden lg:flex flex-col justify-between bg-ink text-white p-12">
        <div className="flex items-center gap-2.5">
          <span className="inline-block size-7 rounded-lg bg-white" aria-hidden />
          <span className="text-lg font-semibold tracking-tight">Kokoon Task</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Own your work.<br />See where you stand.
          </h1>
          <p className="mt-5 text-white/70 text-base leading-relaxed">
            Every task has a deadline and owners. Every deadline change has a reason.
            Everyone sees the same honest picture of who is on track and who is slipping.
          </p>
          <ul className="mt-8 grid gap-3 text-sm text-white/80">
            <li className="flex items-center gap-3"><span className="size-2 rounded-full bg-good" />Done on time</li>
            <li className="flex items-center gap-3"><span className="size-2 rounded-full bg-warn" />Due within 48 hours</li>
            <li className="flex items-center gap-3"><span className="size-2 rounded-full bg-critical" />Overdue, or finished late</li>
          </ul>
        </div>
        <p className="text-xs text-white/40">Kokoon Labs</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="inline-block size-7 rounded-lg bg-ink" aria-hidden />
            <span className="text-lg font-semibold tracking-tight">Kokoon Task</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-ink-2">Use the account your admin created for you.</p>
          <div className="mt-6">
            <LoginForm />
          </div>
          {empty && (
            <div className="mt-6 rounded-xl border border-accent/40 bg-accent-soft p-4 text-sm">
              <p className="font-semibold">No accounts yet</p>
              <p className="mt-1 text-ink-2">Create the first admin account to set up this workspace.</p>
              <Link href="/signup" className="btn btn-primary btn-sm mt-3">Set up workspace</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
