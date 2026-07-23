import type { CandidateDto } from "@/lib/dto";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { IconDoc } from "@/components/ui/icons";

export interface ResumeTabProps {
  resume?: CandidateDto["resume"];
}

/** Raw parsed resume text, or a pointer to where resumes actually get attached (there's no upload control on this tab). */
export function ResumeTab({ resume }: ResumeTabProps) {
  if (!resume) {
    return (
      <EmptyState
        icon={<IconDoc size={18} />}
        title="No resume on file"
        body="Upload one from the Add candidate flow."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-3">Parsed {formatDate(resume.parsedAt)}</p>
      <pre className="whitespace-pre-wrap rounded-md border border-border bg-surface-2 p-3 text-sm text-text">
        {resume.text}
      </pre>
    </div>
  );
}
