import { Skeleton } from "@/components/ui/skeleton";
import type { IconProps } from "@/components/ui/icons";

export interface KpiTileProps {
  label: string;
  value: number;
  icon: (props: IconProps) => React.JSX.Element;
}

const TILE_CLASS = "flex flex-col gap-3 rounded-lg border border-border bg-surface p-4";

/** One KPI stat: label + icon chip on top, big number below. Value uses tabular figures so a live count re-render never reflows its neighbors. */
export function KpiTile({ label, value, icon: Icon }: KpiTileProps) {
  return (
    <div className={TILE_CLASS}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-3">{label}</span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
          <Icon size={15} />
        </span>
      </div>
      <p className="text-3xl font-semibold tracking-tight tabular-nums text-text">{value.toLocaleString("en-US")}</p>
    </div>
  );
}

/** Same footprint as `KpiTile` so the KPI row never reflows once data arrives. */
export function KpiTileSkeleton() {
  return (
    <div className={TILE_CLASS}>
      <div className="flex items-center justify-between">
        <Skeleton width={88} height={13} />
        <Skeleton circle width={28} height={28} />
      </div>
      <Skeleton width={64} height={30} />
    </div>
  );
}
