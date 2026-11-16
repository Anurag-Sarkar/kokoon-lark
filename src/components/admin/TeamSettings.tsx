"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2, Users } from "lucide-react";
import { deleteTeam, setTeamMembers, updateTeam } from "@/lib/actions";
import type { TeamDTO, UserDTO } from "@/lib/types";
import { useAction } from "@/components/useAction";
import { Modal } from "@/components/ui/Modal";
import { ColorPicker, MemberPicker, OwnerSelect } from "./TeamForm";

type Which = "members" | "edit" | "delete" | null;

export function TeamSettings({ team, users }: { team: TeamDTO; users: UserDTO[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<Which>(null);
  const [sel, setSel] = useState<string[]>(team.members);
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description);
  const [color, setColor] = useState(team.color);
  const [owner, setOwner] = useState(team.ownerId ?? "");
  const { run, pending, error, clearError } = useAction();

  const open = (which: Which) => {
    setSel(team.members); setName(team.name); setDescription(team.description); setColor(team.color); setOwner(team.ownerId ?? "");
    clearError(); setModal(which);
  };
  const close = () => setModal(null);
  const errorBox = error && <p role="alert" className="text-sm text-critical-text bg-critical-soft rounded-lg px-3 py-2">{error}</p>;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => open("members")} className="btn btn-secondary"><Users className="size-4" />Members</button>
        <button type="button" onClick={() => open("edit")} className="btn btn-secondary"><Pencil className="size-4" />Edit</button>
        <button type="button" onClick={() => open("delete")} className="btn btn-danger"><Trash2 className="size-4" />Delete</button>
      </div>

      <Modal open={modal === "members"} onClose={close} title={`Who is in ${team.name}?`}>
        <div className="grid gap-3">
          <MemberPicker users={users} selected={sel} onToggle={(id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))} />
          {team.ownerId && <p className="text-[11px] text-ink-3">The team owner always stays a member.</p>}
          {errorBox}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={pending} onClick={() => run(() => setTeamMembers(team.id, sel), close)}>{pending ? "Saving…" : `Save ${sel.length} ${sel.length === 1 ? "member" : "members"}`}</button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "edit"} onClose={close} title="Edit team">
        <div className="grid gap-3">
          <div><label className="label" htmlFor="edit-team-name">Name</label><input id="edit-team-name" value={name} onChange={(e) => setName(e.target.value)} className="input" /></div>
          <div><label className="label" htmlFor="edit-team-description">What they own</label><input id="edit-team-description" value={description} onChange={(e) => setDescription(e.target.value)} className="input" /></div>
          <div><div className="label">Colour</div><ColorPicker name="edit-color" value={color} onChange={setColor} /></div>
          <div>
            <label className="label" htmlFor="edit-team-owner">Team owner</label>
            <OwnerSelect id="edit-team-owner" users={users} value={owner} onChange={setOwner} />
            <p className="mt-1 text-[11px] text-ink-3">Approves deadline changes that members ask for. The owner's own changes go to an admin.</p>
          </div>
          {errorBox}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={pending || name.trim().length < 2} onClick={() => run(() => updateTeam(team.id, name, description, color, owner || null), close)}>{pending ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "delete"} onClose={close} title={`Delete ${team.name}?`}>
        <div className="grid gap-3">
          <p className="text-sm text-ink-2">The people and their tasks stay exactly as they are. Only the grouping goes away, and members lose the team view until they are added to another team.</p>
          {errorBox}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={pending} onClick={() => run(() => deleteTeam(team.id), () => router.push("/admin/teams"))}>{pending ? "Deleting…" : "Delete team"}</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
