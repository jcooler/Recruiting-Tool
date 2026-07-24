import { STAGES } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

const CARDS_PER_COLUMN = 3;

/** Same 5-column footprint as `BoardView` so the pipeline board never reflows once data arrives. */
export function BoardSkeleton() {
  return (
    <ol className="flex gap-4 overflow-x-auto pb-4" aria-label="Loading pipeline">
      {STAGES.map((stage) => (
        <li key={stage} className="w-[82vw] sm:w-72 shrink-0">
          <div className="mb-3 flex items-center gap-2">
            <Skeleton circle width={14} height={14} />
            <Skeleton width={72} height={13} />
            <Skeleton width={22} height={16} borderRadius={999} />
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: CARDS_PER_COLUMN }, (_, i) => (
              <div key={i} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center gap-2">
                  <Skeleton circle width={28} height={28} />
                  <div className="flex-1">
                    <Skeleton width="70%" height={13} />
                    <div className="mt-1">
                      <Skeleton width="45%" height={11} />
                    </div>
                  </div>
                </div>
                <div className="mt-2.5">
                  <Skeleton width={40} height={11} />
                </div>
              </div>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}
