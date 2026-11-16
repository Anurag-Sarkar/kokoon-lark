import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/shell/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Pages enforce the forced password change themselves, so /account can render inside the shell.
  const user = await requireUser({ allowPasswordChange: true });
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[236px_minmax(0,1fr)]">
      <Sidebar user={user} />
      <main className="min-w-0 w-full">
        <div className="mx-auto w-full max-w-[1380px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
