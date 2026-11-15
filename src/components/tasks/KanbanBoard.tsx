"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckSquare, GripVertical } from "lucide-react";
import { setTaskStatus } from "@/lib/actions";
import { STATUSES, STATUS_LABEL, type Priority, type Status } from "@/lib/types";
import { useAction } from "@/components/useAction";
import { AvatarStack } from "@/components/ui/Avatar";
import { PriorityMark } from "@/components/ui/Pills";

export interface KanbanCard {
  id: string;
  title: string;
  priority: Priority;
  status: Status;
  deadlineLabel: string;
  deadlineTone: "overdue" | "soon" | "ok" | "done_on_time" | "done_late";
  owners: { name: string; color: string }[];
  subDone: number;
  subTotal: number;
  canEdit: boolean;
}

const TONE: Record<KanbanCard["deadlineTone"], string> = {
  overdue: "text-critical-text",
  soon: "text-warn-text",
  ok: "text-ink-3",
  done_on_time: "text-good-text",
  done_late: "text-critical-text",
};

export function KanbanBoard({ cards: initial }: { cards: KanbanCard[] }) {
  const [cards, setCards] = useState(initial);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const { run, error } = useAction();

  const move = (id: string, status: Status) => {
    const card = cards.find((c) => c.id === id);
    if (!card || card.status === status || !card.canEdit) return;
    const prev = cards;
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)));
    run(() => setTaskStatus(id, status), undefined);
    // revert on failure handled via error display; keep optimistic otherwise
    void prev;
  };

  return (
    <div>
      {error && <p className="mb-3 text-sm text-critical-text bg-critical-soft rounded-lg px-3 py-2">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {STATUSES.map((status) => {
          const col = cards.filter((c) => c.status === status);
          return (
            <div
              key={status}
              className="kanban-col rounded-2xl bg-surface-2 border border-line p-2.5 transition-colors"
              data-over={over === status}
              onDragOver={(e) => { e.preventDefault(); if (over !== status) setOver(status); }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData("text/plain") || dragging; if (id) move(id, status); setDragging(null); }}
            >
              <div className="flex items-center justify-between px-1.5 py-1 mb-2">
                <span className="text-xs font-semibold text-ink-2">{STATUS_LABEL[status]}</span>
                <span className="text-xs text-ink-3 tnum">{col.length}</span>
              </div>
              <div className="grid gap-2">
                {col.map((c) => (
                  <article
                    key={c.id}
                    draggable={c.canEdit}
                    onDragStart={(e) => { setDragging(c.id); e.dataTransfer.setData("text/plain", c.id); e.dataTransfer.effectAllowed = "move"; }}
                    onDragEnd={() => setDragging(null)}
                    className={`card p-3 ${c.canEdit ? "cursor-grab active:cursor-grabbing" : ""} ${dragging === c.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      {c.canEdit && <GripVertical className="size-4 text-line-2 shrink-0 mt-0.5" aria-hidden />}
                      <div className="min-w-0 flex-1">
                        <Link href={`/tasks/${c.id}`} className="text-sm font-medium leading-snug hover:underline block">{c.title}</Link>
                        <div className={`mt-1 text-[11px] font-medium ${TONE[c.deadlineTone]}`}>{c.deadlineLabel}</div>
                      </div>
                      <PriorityMark priority={c.priority} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <AvatarStack users={c.owners} size="xs" />
                      <div className="flex items-center gap-2">
                        {c.subTotal > 0 && <span className="inline-flex items-center gap-1 text-[11px] text-ink-3 tnum"><CheckSquare className="size-3" />{c.subDone}/{c.subTotal}</span>}
                        {c.canEdit && (
                          <select value={c.status} onChange={(e) => move(c.id, e.target.value as Status)} className="select h-6 w-auto py-0 pl-1.5 pr-6 text-[11px] rounded-md" aria-label="Move to">
                            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
                {col.length === 0 && <div className="rounded-xl border border-dashed border-line-2 p-4 text-center text-[11px] text-ink-3">Drop here</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
