import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
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
          <div className="mt-8 rounded-xl border border-line bg-surface p-4 text-xs text-ink-2 leading-relaxed">
            <p className="font-semibold text-ink mb-1">Demo accounts</p>
            <p>Admin: <span className="font-mono">admin@kokoon.ai</span> / <span className="font-mono">admin123</span></p>
            <p>Member: <span className="font-mono">priya@kokoon.ai</span> / <span className="font-mono">password123</span></p>
            <p className="mt-1 text-ink-3">Also rohan@, sara@, dev@, meera@ with the same password.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
