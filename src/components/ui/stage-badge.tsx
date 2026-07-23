import type { CSSProperties } from "react";
import { STAGE_LABELS, type Stage } from "@/lib/types";
import { cn } from "@/lib/cn";
import { IconCheck, IconChat, IconDoc, IconFilter, IconInbox, IconX, type IconProps } from "./icons";

export interface StageBadgeProps {
  stage: Stage;
  rejected?: boolean;
  className?: string;
}

const STAGE_ICON: Record<Stage, (props: IconProps) => React.JSX.Element> = {
  applied: IconInbox,
  screening: IconFilter,
  interview: IconChat,
  offer: IconDoc,
  hired: IconCheck,
};

/**
 * Pipeline stage indicator: tint + icon + visible text label together, so
 * stage is never conveyed by color alone (colorblind-safe) and never by
 * icon alone (label always present). `rejected` overrides the stage's own
 * visual — a rejected candidate always renders the "Rejected" tint/icon/label
 * regardless of which stage they were rejected from.
 */
export function StageBadge({ stage, rejected = false, className }: StageBadgeProps) {
  const tone = rejected ? "rejected" : stage;
  const label = rejected ? "Rejected" : STAGE_LABELS[stage];
  const Icon = rejected ? IconX : STAGE_ICON[stage];
  const style = {
    backgroundColor: `var(--stage-${tone}-bg)`,
    color: `var(--stage-${tone}-fg)`,
  } as CSSProperties;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", className)}
      style={style}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}
