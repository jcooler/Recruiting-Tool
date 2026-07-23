"use client";

import { useState } from "react";
import { useAddNote } from "@/hooks/queries";
import { ApiClientError } from "@/lib/api-client";
import type { CandidateDto } from "@/lib/dto";
import { formatRelative } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { IconChat } from "@/components/ui/icons";

function serverMessage(err: unknown): string {
  return err instanceof ApiClientError ? err.message : "Something went wrong. Try again.";
}

export interface NotesTabProps {
  candidateId: string;
  notes: CandidateDto["notes"];
}

/**
 * Notes list (newest first) plus a composer any signed-in role can use —
 * unlike the rest of the drawer's mutations, adding a note isn't gated
 * behind `canEdit`. `useAddNote` only invalidates on success (no optimistic
 * update per the task brief), so the new note appears once the refetch
 * resolves rather than immediately.
 */
export function NotesTab({ candidateId, notes }: NotesTabProps) {
  const [draft, setDraft] = useState("");
  const addNote = useAddNote(candidateId);

  const sorted = [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  async function handleAdd() {
    const body = draft.trim();
    if (!body) return;
    try {
      await addNote.mutateAsync({ body });
      setDraft("");
    } catch (err) {
      toast({ title: "Couldn't add note", description: serverMessage(err), variant: "error" });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {sorted.length === 0 ? (
        <EmptyState
          icon={<IconChat size={18} />}
          title="No notes yet"
          body="Notes about this candidate will show up here."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {sorted.map((note, i) => (
            <li
              key={`${note.createdAt}-${i}`}
              className="flex flex-col gap-1 border-b border-border pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-text">{note.authorName}</span>
                <span className="shrink-0 text-xs text-text-3">{formatRelative(note.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-text-2">{note.body}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <Textarea
          aria-label="Add a note"
          placeholder="Leave a note for the team…"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button size="sm" className="self-end" loading={addNote.isPending} disabled={!draft.trim()} onClick={handleAdd}>
          Add note
        </Button>
      </div>
    </div>
  );
}
