"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarClock, LayoutDashboard, ListTodo, LogOut, Plus, SquareKanban, UserCog, Users, UsersRound } from "lucide-react";
import { logout } from "@/lib/actions";
import type { UserDTO } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; match: (path: string, view: string | null) => boolean };

export function Sidebar({ user }: { user: UserDTO }) {
  const path = usePathname();
  const view = useSearchParams().get("view");

  const main: Item[] = [
    { href: "/dashboard", label: "My dashboard", icon: LayoutDashboard, match: (p) => p === "/dashboard" },
    { href: "/tasks", label: "Tasks", icon: ListTodo, match: (p, v) => p === "/tasks" && v !== "board" },
    { href: "/tasks?view=board", label: "Board", icon: SquareKanban, match: (p, v) => p === "/tasks" && v === "board" },
  ];
  const admin: Item[] = [
    { href: "/admin", label: "Team overview", icon: Users, match: (p) => p === "/admin" || p.startsWith("/admin/people/") },
    { href: "/admin/teams", label: "Teams", icon: UsersRound, match: (p) => p.startsWith("/admin/teams") },
    { href: "/admin/people", label: "People", icon: UserCog, match: (p) => p === "/admin/people" },
    { href: "/admin/deadline-changes", label: "Deadline log", icon: CalendarClock, match: (p) => p === "/admin/deadline-changes" },
  ];

  const render = (items: Item[]) =>
    items.map(({ href, label, icon: Icon, match }) => (
      <Link key={href} href={href} className="nav-link" data-active={match(path, view)}>
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    ));

  return (
    <aside className="lg:sticky lg:top-0 lg:h-screen border-b lg:border-b-0 lg:border-r border-line bg-surface flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-4 lg:px-5 lg:py-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="inline-block size-7 rounded-lg bg-ink" aria-hidden />
          <span className="font-semibold tracking-tight">Kokoon Task</span>
        </Link>
        <Link href="/tasks/new" className="btn btn-primary btn-sm lg:hidden"><Plus className="size-4" />New</Link>
      </div>

      <nav className="flex lg:flex-col gap-1 px-3 pb-3 lg:pb-0 overflow-x-auto scrollbar-thin lg:overflow-visible">
        {render(main)}
        {user.role === "admin" && (
          <>
            <div className="hidden lg:block mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Manage</div>
            {render(admin)}
          </>
        )}
      </nav>

      <div className="hidden lg:block px-3 mt-4">
        <Link href="/tasks/new" className="btn btn-primary w-full"><Plus className="size-4" />New task</Link>
      </div>

      <div className="hidden lg:flex mt-auto items-center gap-3 border-t border-line px-4 py-4">
        <Avatar user={user} size="md" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{user.name}</div>
          <div className="text-xs text-ink-3 truncate">{user.role === "admin" ? "Admin" : user.title || "Member"}</div>
        </div>
        <form action={logout}>
          <button type="submit" className="btn btn-ghost btn-sm px-2" title="Sign out" aria-label="Sign out"><LogOut className="size-4" /></button>
        </form>
      </div>
    </aside>
  );
}
