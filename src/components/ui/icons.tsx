import type { ReactNode, SVGProps } from "react";

/**
 * Hand-written inline icon set. Every icon is decorative by default
 * (`aria-hidden="true"`) — when an icon conveys meaning on its own, the
 * consuming component must pair it with visible text (see StageBadge,
 * StarRating) rather than relying on `aria-label` here.
 */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  size?: number;
}

const STROKE_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function makeIcon(paths: ReactNode, viewBox = "0 0 24 24") {
  function IconComponent({ size = 16, ...props }: IconProps) {
    return (
      <svg viewBox={viewBox} width={size} height={size} aria-hidden="true" focusable="false" {...STROKE_PROPS} {...props}>
        {paths}
      </svg>
    );
  }
  return IconComponent;
}

/** Filled variant (solid shape, no stroke) — used for IconStarFilled and IconDots. */
function makeFilledIcon(paths: ReactNode, viewBox = "0 0 24 24") {
  function IconComponent({ size = 16, ...props }: IconProps) {
    return (
      <svg
        viewBox={viewBox}
        width={size}
        height={size}
        fill="currentColor"
        stroke="none"
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {paths}
      </svg>
    );
  }
  return IconComponent;
}

const STAR_PATH = "M12 3.4l2.7 5.6 6.1.7-4.5 4.3 1.1 6-5.4-2.9-5.4 2.9 1.1-6-4.5-4.3 6.1-.7L12 3.4Z";

export const IconPlus = makeIcon(<path d="M12 4.5v15M4.5 12h15" />);

export const IconSearch = makeIcon(
  <>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M19.5 19.5 15 15" />
  </>
);

export const IconBoard = makeIcon(
  <>
    <rect x="3" y="4" width="5" height="16" rx="1.2" />
    <rect x="9.5" y="4" width="5" height="11" rx="1.2" />
    <rect x="16" y="4" width="5" height="8" rx="1.2" />
  </>
);

export const IconTable = makeIcon(
  <>
    <rect x="3" y="4.5" width="18" height="15" rx="1.5" />
    <path d="M3 9.5h18M3 14.5h18M9.5 4.5v15" />
  </>
);

export const IconStar = makeIcon(<path d={STAR_PATH} />);

export const IconStarFilled = makeFilledIcon(<path d={STAR_PATH} />);

export const IconInbox = makeIcon(
  <>
    <path d="M3 12.5h4.8l1.6 2.5h5.2l1.6-2.5H21" />
    <path d="M5.3 12.5 5.3 7a2 2 0 0 1 2-2h9.4a2 2 0 0 1 2 2v5.5" />
    <path d="M3 12.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5.5" />
  </>
);

export const IconFilter = makeIcon(<path d="M4 5h16l-6.2 7.4V19l-3.6 2v-8.6L4 5Z" />);

export const IconChat = makeIcon(
  <path d="M4.5 6.2a1.8 1.8 0 0 1 1.8-1.8h11.4a1.8 1.8 0 0 1 1.8 1.8v7.6a1.8 1.8 0 0 1-1.8 1.8H10l-4 3.4v-3.4H6.3a1.8 1.8 0 0 1-1.8-1.8Z" />
);

export const IconDoc = makeIcon(
  <>
    <path d="M7 3.5h6.5L18 8v11.7a.8.8 0 0 1-.8.8H7a.8.8 0 0 1-.8-.8V4.3a.8.8 0 0 1 .8-.8Z" />
    <path d="M13.5 3.5V8H18" />
    <path d="M9 12.5h6M9 15.8h6" />
  </>
);

export const IconCheck = makeIcon(<path d="M4.5 12.8l4.8 4.8L19.5 7.2" />);

export const IconX = makeIcon(<path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />);

export const IconSun = makeIcon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4l1.4-1.4M18 6l1.4-1.4" />
  </>
);

export const IconMoon = makeIcon(<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />);

export const IconUser = makeIcon(
  <>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.8 20c0-3.9 3.2-6.5 7.2-6.5s7.2 2.6 7.2 6.5" />
  </>
);

export const IconBriefcase = makeIcon(
  <>
    <rect x="3" y="7.5" width="18" height="12" rx="1.5" />
    <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
    <path d="M3 13h18" />
  </>
);

export const IconChart = makeIcon(<path d="M4 20V10M11 20V4M18 20v-7M3.5 20h17" />);

export const IconSettings = makeIcon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7M18.6 18.6l-1.7-1.7M7.1 7.1 5.4 5.4" />
  </>
);

export const IconLogout = makeIcon(
  <>
    <path d="M9.5 4H6.3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3.2" />
    <path d="M15 16l4-4-4-4" />
    <path d="M19 12H9.5" />
  </>
);

export const IconUpload = makeIcon(
  <>
    <path d="M12 15V4" />
    <path d="M7 8.5 12 3.5l5 5" />
    <path d="M4.5 16v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" />
  </>
);

export const IconDots = makeFilledIcon(
  <>
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="19" cy="12" r="1.6" />
  </>
);

export const IconChevronDown = makeIcon(<path d="M6 9.5l6 6 6-6" />);

export const IconArrowRight = makeIcon(<path d="M4 12h16M13 5.5l7 6.5-7 6.5" />);

export const IconClock = makeIcon(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3.3 2" />
  </>
);
