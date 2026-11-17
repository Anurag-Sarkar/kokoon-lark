import Link from "next/link";
import { initials } from "@/lib/format";
import type { UserDTO } from "@/lib/types";

const SIZES = { xs: "size-5 text-[9px]", sm: "size-6 text-[10px]", md: "size-8 text-xs", lg: "size-10 text-sm", xl: "size-14 text-lg" } as const;

type Person = Pick<UserDTO, "name" | "color"> & { id?: string };

/** Where a person's name or avatar leads when clicked. */
export const personHref = (id: string): string => `/people/${id}`;

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

/**
 * Avatar + name that opens the person's page. `relative z-10` keeps it clickable inside a row whose
 * whole surface is a stretched link (see TaskRow).
 */
export function PersonLink({ user, size = "xs", className = "", nameClassName = "text-[11px] font-medium text-ink-2", children }: {
  user: Person & { id: string };
  size?: keyof typeof SIZES;
  className?: string;
  nameClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link href={personHref(user.id)} className={`relative z-10 inline-flex items-center gap-1.5 min-w-0 rounded-md hover:underline ${className}`} title={`${user.name}'s page`}>
      <Avatar user={user} size={size} />
      <span className={`whitespace-nowrap ${nameClassName}`}>{children ?? user.name}</span>
    </Link>
  );
}

/** Owners shown as avatar + full name chips, wrapping onto new lines as needed. Each chip links to the person when it has an id. */
export function OwnerList({ users, size = "xs", className = "", emptyLabel = "Unassigned", linked = true }: { users: Person[]; size?: keyof typeof SIZES; className?: string; emptyLabel?: string; linked?: boolean }) {
  if (users.length === 0) return <span className={`text-[11px] text-ink-3 ${className}`}>{emptyLabel}</span>;
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 ${className}`}>
      {users.map((u, i) =>
        linked && u.id ? (
          <PersonLink key={u.id} user={{ ...u, id: u.id }} size={size} />
        ) : (
          <span key={`${u.name}-${i}`} className="inline-flex items-center gap-1.5 min-w-0">
            <Avatar user={u} size={size} />
            <span className="text-[11px] font-medium text-ink-2 whitespace-nowrap">{u.name}</span>
          </span>
        )
      )}
    </span>
  );
}
