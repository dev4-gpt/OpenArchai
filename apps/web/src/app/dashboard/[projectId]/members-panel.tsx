"use client";

import { useState } from "react";
import { addProjectMember, removeProjectMember } from "./members-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Member = { user_id: string; email: string; role: "owner" | "editor"; created_at: string };

export function MembersPanel({
  projectId,
  initialMembers,
  isOwner,
}: {
  projectId: string;
  initialMembers: Member[];
  isOwner: boolean;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!email.trim()) return;
    setPending(true);
    setError(null);
    try {
      await addProjectMember(projectId, email);
      setMembers((prev) => [...prev, { user_id: "", email: email.trim().toLowerCase(), role: "editor", created_at: new Date().toISOString() }]);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setPending(false);
    }
  }

  async function handleRemove(memberUserId: string) {
    if (!confirm("Remove this member's access to the project?")) return;
    setPending(true);
    setError(null);
    try {
      await removeProjectMember(projectId, memberUserId);
      setMembers((prev) => prev.filter((m) => m.user_id !== memberUserId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
      <p className="text-sm font-medium">Project members</p>
      <p className="text-xs text-muted">
        {isOwner
          ? "Staff you add here can view and edit this project."
          : "Only the project owner can add or remove members."}
      </p>

      <ul className="space-y-1.5">
        {members.map((m) => (
          <li key={m.user_id || m.email} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-foreground">
              {m.email} <span className="text-muted">({m.role})</span>
            </span>
            {isOwner && m.role !== "owner" && m.user_id && (
              <button
                type="button"
                onClick={() => handleRemove(m.user_id)}
                disabled={pending}
                className="text-danger underline underline-offset-2 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {isOwner && (
        <div className="flex items-center gap-2 pt-1">
          <Input
            type="email"
            placeholder="colleague@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="text-xs"
          />
          <Button type="button" variant="secondary" size="sm" onClick={handleAdd} disabled={pending}>
            {pending ? "Adding…" : "Add"}
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
