import { initials } from "@/lib/format";
import type { UserDTO } from "@/lib/types";

const SIZES = { xs: "size-5 text-[9px]", sm: "size-6 text-[10px]", md: "size-8 text-xs", lg: "size-10 text-sm", xl: "size-14 text-lg" } as const;

export function Avatar({ user, size = "md", className = "" }: { user: Pick<UserDTO, "name" | "color">; size?: keyof typeof SIZES; className?: string }) {
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

export function AvatarStack({ users, max = 3, size = "sm" }: { users: Pick<UserDTO, "name" | "color">[]; max?: number; size?: keyof typeof SIZES }) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <span className="inline-flex items-center -space-x-1.5">
      {shown.map((u, i) => <Avatar key={`${u.name}-${i}`} user={u} size={size} />)}
      {rest > 0 && (
        <span className={`inline-flex items-center justify-center rounded-full bg-line text-ink-2 font-semibold ring-2 ring-surface ${SIZES[size]}`}>+{rest}</span>
      )}
    </span>
  );
}
