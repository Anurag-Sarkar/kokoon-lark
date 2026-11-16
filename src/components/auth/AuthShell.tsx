import Link from "next/link";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link href="/login" className="inline-flex items-center gap-2.5 mb-8">
          <span className="inline-block size-7 rounded-lg bg-ink" aria-hidden />
          <span className="text-lg font-semibold tracking-tight">Kokoon Task</span>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-6 text-sm text-ink-2">{footer}</div>}
      </div>
    </main>
  );
}
