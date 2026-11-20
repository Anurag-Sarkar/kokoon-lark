import Link from "next/link";
import { CalendarClock, StickyNote } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listBulletinPosts, listTasksByIds, listUsers, userMap } from "@/lib/queries";
import { fmtShortDateTime, timeAgo } from "@/lib/format";
import type { BulletinPostDTO, TaskDTO, UserDTO } from "@/lib/types";
import { EmptyState, PageHeader, SectionTitle } from "@/components/shell/PageHeader";
import { OwnerCell, PersonLink } from "@/components/ui/Avatar";
import { LinkSpinner } from "@/components/ui/LinkPending";
import { PriorityMark, Tag } from "@/components/ui/Pills";
import { TaskStatePill } from "@/components/tasks/TaskRow";
import { EditPostButton, PickUpButton, PostButton } from "@/components/bulletin/BulletinActions";

/** One open post: what it is, who put it up, and the button that makes it somebody's task. */
function OpenPost({ post, poster, now, canEdit, isMine }: { post: BulletinPostDTO; poster: UserDTO | undefined; now: Date; canEdit: boolean; isMine: boolean }) {
  return (
    <li className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-ink-3">
            <PriorityMark priority={post.priority} withLabel />
            {post.wantedBy && <span className="inline-flex items-center gap-1 whitespace-nowrap" title="The poster's hint, not a deadline"><CalendarClock className="size-3" />ideally by {fmtShortDateTime(post.wantedBy)}</span>}
          </div>
          <h3 className="mt-1.5 text-sm font-semibold leading-snug">{post.title}</h3>
        </div>
        {canEdit && <EditPostButton post={post} />}
      </div>
      {post.description && <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-wrap line-clamp-4">{post.description}</p>}
      {post.tags.length > 0 && <div className="flex flex-wrap gap-1.5">{post.tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>}
      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 min-w-0 text-[11px] text-ink-3">
          {poster ? <PersonLink user={poster} size="xs" nameClassName="text-[11px] font-medium text-ink-2">{isMine ? "You" : poster.name}</PersonLink> : <span className="font-medium text-ink-2">Someone</span>}
          <span className="whitespace-nowrap">· {timeAgo(post.createdAt, now)}</span>
        </div>
        <PickUpButton post={post} posterName={isMine ? "you" : poster?.name ?? "someone"} />
      </div>
    </li>
  );
}

/** A post that became a task: who took it and how that task is doing. The row opens the task. */
function PickedRow({ post, poster, picker, task, now }: { post: BulletinPostDTO; poster: UserDTO | undefined; picker: UserDTO | undefined; task: TaskDTO | undefined; now: Date }) {
  const detail = `Posted by ${poster?.name.split(" ")[0] ?? "someone"} · picked up ${post.pickedAt ? timeAgo(post.pickedAt, now) : ""}${task ? ` · due ${fmtShortDateTime(task.deadline)}` : ""}`;
  return (
    <div className="row-link relative grid grid-cols-[minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_10.5rem_8.25rem] items-center gap-x-3 px-3 py-2.5 border-t border-line first:border-t-0">
      {task && (
        <Link href={`/tasks/${task.id}`} className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2" aria-label={post.title}>
          <LinkSpinner className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-surface" />
        </Link>
      )}
      <div className="min-w-0">
        <div className={`text-sm font-medium truncate ${task?.status === "done" ? "text-ink-2" : ""}`}>{post.title}</div>
        <div className="mt-0.5 text-[11px] text-ink-3">{detail}</div>
        <div className="sm:hidden mt-1.5 flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-[11px] font-medium text-ink-2">{picker?.name ?? "Someone"}</span>
          {task ? <TaskStatePill task={task} now={now} /> : <span className="text-[11px] text-ink-3">Task removed</span>}
        </div>
      </div>
      <span className="hidden sm:flex min-w-0"><OwnerCell users={picker ? [picker] : []} emptyLabel="Someone" /></span>
      <span className="hidden sm:flex">{task ? <TaskStatePill task={task} now={now} /> : <span className="text-[11px] text-ink-3">Task removed</span>}</span>
    </div>
  );
}

export default async function BulletinPage() {
  const user = await requireUser();
  const now = new Date();
  const [users, { open, picked }] = await Promise.all([listUsers({ includeInactive: true }), listBulletinPosts()]);
  const umap = userMap(users);
  const tasks = new Map((await listTasksByIds(picked.flatMap((p) => (p.taskId ? [p.taskId] : [])))).map((t) => [t.id, t]));
  const isAdmin = user.role === "admin";

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title="Bulletin board"
        subtitle="Work that needs doing but has no owner yet. Post something, or pick something up and set your own deadline."
        actions={<PostButton />}
      />

      <section>
        <SectionTitle hint={open.length === 0 ? "nothing waiting" : `${open.length} waiting for someone`}>Up for grabs</SectionTitle>
        {open.length === 0 ? (
          <EmptyState title="The board is empty" body="Post something that needs doing. Anyone can pick it up, with a deadline of their own." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {open.map((p) => <OpenPost key={p.id} post={p} poster={umap.get(p.postedBy)} now={now} canEdit={isAdmin || p.postedBy === user.id} isMine={p.postedBy === user.id} />)}
          </ul>
        )}
      </section>

      {picked.length > 0 && (
        <section>
          <SectionTitle hint="most recent first · each row opens the task">Picked up</SectionTitle>
          <div className="card overflow-hidden">
            {picked.map((p) => <PickedRow key={p.id} post={p} poster={umap.get(p.postedBy)} picker={p.pickedBy ? umap.get(p.pickedBy) : undefined} task={p.taskId ? tasks.get(p.taskId) : undefined} now={now} />)}
          </div>
        </section>
      )}

      <p className="text-xs text-ink-3 inline-flex items-center gap-1.5"><StickyNote className="size-3.5" />Picking something up makes it a task of your own: it counts in your ownership score like any other, and the person who posted it is told. If that task is later deleted, the post goes back on the board.</p>
    </div>
  );
}
