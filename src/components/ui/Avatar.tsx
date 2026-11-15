import { initials } from "@/lib/format";
import type { UserDTO } from "@/lib/types";

const SIZES = { xs: "size-5 text-[9px]", sm: "size-6 text-[10px]", md: "size-8 text-xs", lg: "size-10 text-sm", xl: "size-14 text-lg" } as const;

type Person = Pick<UserDTO, "name" | "color">;

export function Avatar({ user, size = "md", className = "" }: { user: Person; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface ${SIZES[size]} ${className}`}
      style={{ backgroundColor: user.color }}
      title={user.name}
      aria-label={user.name}
    >
      {initials(user.name)}
    </span>
  );
}

/** Owners shown as avatar + full name chips, wrapping onto new lines as needed. */
export function OwnerList({ users, size = "xs", className = "", emptyLabel = "Unassigned" }: { users: Person[]; size?: keyof typeof SIZES; className?: string; emptyLabel?: string }) {
  if (users.length === 0) return <span className={`text-[11px] text-ink-3 ${className}`}>{emptyLabel}</span>;
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 ${className}`}>
      {users.map((u, i) => (
        <span key={`${u.name}-${i}`} className="inline-flex items-center gap-1.5 min-w-0">
          <Avatar user={u} size={size} />
          <span className="text-[11px] font-medium text-ink-2 whitespace-nowrap">{u.name}</span>
        </span>
      ))}
    </span>
  );
}
