import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}

/** Centered placeholder for empty lists/tables/boards. Used everywhere. */
export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-16 text-center", className)}>
      {icon && (
        <div className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-text-3" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-text">{title}</p>
        {body && <p className="max-w-sm text-sm text-text-3">{body}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
