// Re-export of react-loading-skeleton. Colors come from the `SkeletonTheme`
// mounted once in src/components/providers.tsx (wired to the design tokens
// `--skeleton-base` / `--skeleton-highlight`, themed per app/globals.css) —
// individual `<Skeleton />` usages never need to set color props themselves.
import "react-loading-skeleton/dist/skeleton.css";

export { default as Skeleton } from "react-loading-skeleton";
export { SkeletonTheme } from "react-loading-skeleton";
