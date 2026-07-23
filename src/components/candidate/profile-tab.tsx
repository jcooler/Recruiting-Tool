import type { ReactNode } from "react";
import type { CandidateDto } from "@/lib/dto";
import { formatDate } from "@/lib/format";
import { SOURCE_LABELS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-3">{title}</h3>
      {children}
    </section>
  );
}

function ChipList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) return <p className="text-sm text-text-3">{emptyLabel}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant="neutral">
          {item}
        </Badge>
      ))}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-3">{label}</p>
      <p className="mt-1 truncate text-sm text-text">{value}</p>
    </div>
  );
}

export interface ProfileTabProps {
  candidate: CandidateDto;
}

/**
 * Static profile facts: skills/tags chips, a reverse-chronological
 * experience timeline, and the education/pay/source detail row — in the
 * order the task-26 brief lists them. `experience` is sorted newest-first
 * here rather than trusting array order, since neither the schema nor the
 * create/edit flows guarantee callers append entries chronologically.
 */
export function ProfileTab({ candidate }: ProfileTabProps) {
  const experience = [...candidate.experience].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  return (
    <div className="flex flex-col gap-6">
      <Section title="Skills">
        <ChipList items={candidate.skills} emptyLabel="No skills listed." />
      </Section>

      <Section title="Tags">
        <ChipList items={candidate.tags} emptyLabel="No tags." />
      </Section>

      <Section title="Experience">
        {experience.length === 0 ? (
          <p className="text-sm text-text-3">No experience listed.</p>
        ) : (
          <ol className="relative flex flex-col border-l border-border">
            {experience.map((exp, i) => (
              <li key={i} className="relative pb-4 pl-5 last:pb-0">
                <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full border-2 border-surface bg-accent" />
                <p className="text-sm font-medium text-text">
                  {exp.title} <span className="font-normal text-text-3">@ {exp.company}</span>
                </p>
                <p className="mt-0.5 text-xs text-text-3">
                  {formatDate(exp.startDate)} – {exp.endDate ? formatDate(exp.endDate) : "Present"}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Detail label="Education" value={candidate.education || "—"} />
        <Detail label="Desired pay" value={candidate.desiredPay || "—"} />
        <Detail label="Source" value={SOURCE_LABELS[candidate.source]} />
      </div>
    </div>
  );
}
