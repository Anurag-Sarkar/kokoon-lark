import Link from "next/link";
import { Hourglass } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listTasksWithPendingRequests, listTeams, listUsers, userMap } from "@/lib/queries";
import { canReview, isTeamOwner, pendingDeadlineRequest, reviewerLabel, reviewersFor } from "@/lib/approvals";
import { fmtShortDateTime, shiftLabel, timeAgo } from "@/lib/format";
import type { DeadlineRequestDTO, TaskDTO, UserDTO } from "@/lib/types";
import { PageHeader, SectionTitle, EmptyState } from "@/components/shell/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { ReviewButtons } from "@/components/approvals/ReviewButtons";

type Item = { task: TaskDTO; req: DeadlineRequestDTO };

function RequestCard({ item: { task, req }, requester, now, footer, children }: { item: Item; requester: UserDTO | undefined; now: Date; footer?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <li className="card p-4 grid gap-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/tasks/${task.id}`} className="text-sm font-semibold hover:underline">{task.title}</Link>
          <div className="mt-1 flex items-center gap-2 text-xs text-ink-2">
            {requester && <Avatar user={requester} size="xs" />}
            <span><span className="font-medium text-ink">{requester?.name ?? "Someone"}</span> · asked {timeAgo(req.createdAt, now)}</span>
          </div>
        </div>
        <div className="text-xs text-right">
          <div className="font-semibold tnum">{fmtShortDateTime(task.deadline)} → {fmtShortDateTime(req.newDeadline)}</div>
          <div className="text-warn-text font-semibold">{shiftLabel(task.deadline, req.newDeadline)}</div>
        </div>
      </div>
      <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-2">“{req.reason}”</p>
      {footer && <p className="text-[11px] text-ink-3">{footer}</p>}
      {children}
    </li>
  );
}

export default async function ApprovalsPage() {
  const user = await requireUser();
  const now = new Date();
  const [users, teams, tasks] = await Promise.all([listUsers({ includeInactive: true }), listTeams(), listTasksWithPendingRequests()]);
  const umap = userMap(users);
  const items: Item[] = tasks.flatMap((task) => { const req = pendingDeadlineRequest(task); return req ? [{ task, req }] : []; });
  const toReview = items.filter(({ req }) => canReview(user, req.requestedBy, teams));
  const own = items.filter(({ req }) => req.requestedBy === user.id);
  const reviewer = user.role === "admin" || isTeamOwner(user.id, teams);

  return (
    <div className="grid grid-cols-1 gap-6">
      <PageHeader
        title="Approvals"
        subtitle={reviewer
          ? user.role === "admin" ? "Deadline changes waiting for a decision. Admins can decide any of them; team owners decide for their own members." : "Deadline changes your team members have asked for. The current deadline counts until you decide."
          : "Deadline changes you've asked for, and who they're waiting on."}
      />

      {reviewer && (
        <section>
          <SectionTitle hint={toReview.length === 0 ? "nothing waiting" : `${toReview.length} waiting`}>Waiting for you</SectionTitle>
          {toReview.length === 0 ? (
            <EmptyState title="Nothing to approve right now" body="When someone on your team asks to move a deadline, it shows up here and you get an email." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {toReview.map((item) => (
                <RequestCard key={item.req.id} item={item} requester={umap.get(item.req.requestedBy)} now={now}>
                  <ReviewButtons taskId={item.task.id} requestId={item.req.id} canReview canWithdraw={user.role === "admin"} />
                </RequestCard>
              ))}
            </ul>
          )}
        </section>
      )}

      {(own.length > 0 || !reviewer) && (
        <section>
          <SectionTitle hint={own.length === 0 ? "none" : `${own.length} open`}>Your requests</SectionTitle>
          {own.length === 0 ? (
            <EmptyState title="You haven't asked for any deadline changes" body="Open a task and choose “Ask to change deadline”. It goes to your team owner, or an admin, for approval." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {own.map((item) => (
                <RequestCard key={item.req.id} item={item} requester={umap.get(item.req.requestedBy)} now={now} footer={`Waiting for ${reviewerLabel(reviewersFor(item.req.requestedBy, users, teams))}.`}>
                  <ReviewButtons taskId={item.task.id} requestId={item.req.id} canReview={false} canWithdraw />
                </RequestCard>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="text-xs text-ink-3 inline-flex items-center gap-1.5"><Hourglass className="size-3.5" />Admins move deadlines directly. Everyone else asks the level above: members ask their team owner, team owners ask an admin.</p>
    </div>
  );
}
