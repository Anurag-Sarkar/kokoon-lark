"use client";

import { useState } from "react";
import { Check, Undo2, X } from "lucide-react";
import { reviewDeadlineRequest, withdrawDeadlineRequest } from "@/lib/actions";
import { useAction } from "@/components/useAction";
import { Modal } from "@/components/ui/Modal";

/** Approve / turn down (reviewers) and withdraw (requester) for one pending deadline request. */
export function ReviewButtons({ taskId, requestId, canReview, canWithdraw }: { taskId: string; requestId: string; canReview: boolean; canWithdraw: boolean }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const { run, pending, error, clearError } = useAction();
  if (!canReview && !canWithdraw) return null;
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {canReview && (
          <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => reviewDeadlineRequest(taskId, requestId, "approve"))}>
            <Check className="size-3.5" />{pending ? "Saving…" : "Approve"}
          </button>
        )}
        {canReview && (
          <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => { setNote(""); clearError(); setRejecting(true); }}>
            <X className="size-3.5" />Turn down
          </button>
        )}
        {canWithdraw && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => withdrawDeadlineRequest(taskId, requestId))}>
            <Undo2 className="size-3.5" />Withdraw
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-critical-text bg-critical-soft rounded-lg px-2.5 py-1.5">{error}</p>}
      <Modal open={rejecting} onClose={() => setRejecting(false)} title="Turn down this deadline change?">
        <div className="grid gap-3">
          <p className="text-sm text-ink-2">The deadline stays as it is, and the person who asked is told.</p>
          <div>
            <label className="label" htmlFor="reject-note">Note <span className="text-ink-3 font-normal">(optional)</span></label>
            <textarea id="reject-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="textarea" placeholder="e.g. The client demo is fixed. Let's cut scope instead." />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setRejecting(false)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={pending} onClick={() => run(() => reviewDeadlineRequest(taskId, requestId, "reject", note), () => setRejecting(false))}>{pending ? "Saving…" : "Turn down"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
