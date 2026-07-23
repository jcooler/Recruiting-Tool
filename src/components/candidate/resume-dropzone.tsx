"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import { useParseResume, type ParseResumeResult } from "@/hooks/queries";
import { ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { IconUpload } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ".pdf,.docx";

function serverMessage(err: unknown): string {
  return err instanceof ApiClientError ? err.message : "Something went wrong. Try again.";
}

export interface ResumeDropzoneProps {
  /** Fired once `useParseResume` resolves — the caller owns what "prefill the form" means. */
  onParsed: (result: ParseResumeResult) => void;
  /** "Enter manually instead" — the caller switches to the Manual tab. */
  onEnterManually: () => void;
}

/**
 * The "From resume" tab's landing state: a styled drop target that's really
 * a `<label>` wrapping a visually-hidden `<input type="file">`. Because the
 * input itself (not the label) receives focus, it stays fully reachable by
 * Tab and opens the native file picker on Enter/Space — `sr-only` only
 * clips it visually, it never leaves the tab order the way `hidden` or
 * `display: none` would. Dragging a file over the label is layered on top
 * of that same native behavior via onDragOver/onDrop; both paths — picked
 * or dropped — funnel into the one `handleFile`.
 *
 * The 5 MB size check runs client-side, before anything is uploaded — a
 * file that fails it never reaches `useParseResume`. A file that reaches
 * the parser but comes back a 422 (unparseable / corrupt / image-only, see
 * `app/api/resumes/parse/route.ts`) surfaces that exact server message
 * inline, alongside an escape hatch to the Manual tab rather than a dead
 * end.
 */
export function ResumeDropzone({ onParsed, onEnterManually }: ResumeDropzoneProps) {
  const parseResume = useParseResume();
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFile(file: File) {
    setSizeError(null);
    if (file.size > MAX_BYTES) {
      // Clear any error left over from a previous (server-side) parse
      // failure — otherwise picking an oversized file right after a 422
      // would show both messages stacked, since `useMutation`'s error state
      // only clears on the next `mutate()` call, which an early return here
      // never reaches.
      parseResume.reset();
      setSizeError("File too large (max 5 MB)");
      return;
    }
    parseResume.mutate(file, { onSuccess: onParsed });
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so picking the same file again (e.g. after fixing it elsewhere)
    // still fires onChange.
    event.target.value = "";
    if (file) handleFile(file);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const pending = parseResume.isPending;

  return (
    <div className="flex flex-col gap-3">
      <label
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
          "focus-within:outline-none focus-within:outline-2 focus-within:outline-accent focus-within:outline-offset-2",
          dragActive ? "border-accent bg-accent-soft" : "border-border bg-surface-2 hover:border-accent/50",
          pending && "pointer-events-none opacity-70"
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          disabled={pending}
          onChange={handleInputChange}
          className="sr-only"
        />
        {pending ? (
          <>
            <Spinner size={20} className="text-accent" />
            <p className="text-sm font-medium text-text">Reading resume…</p>
          </>
        ) : (
          <>
            <IconUpload size={20} className="text-text-3" />
            <p className="text-sm font-medium text-text">Drop a resume here, or click to browse</p>
            <p className="text-xs text-text-3">PDF or DOCX, up to 5 MB</p>
          </>
        )}
      </label>

      {sizeError && (
        <p role="alert" className="text-sm text-danger">
          {sizeError}
        </p>
      )}

      {parseResume.isError && (
        <div role="alert" className="flex flex-col items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5">
          <p className="text-sm text-danger">{serverMessage(parseResume.error)}</p>
          <Button type="button" variant="secondary" size="sm" onClick={onEnterManually}>
            Enter manually instead
          </Button>
        </div>
      )}
    </div>
  );
}
