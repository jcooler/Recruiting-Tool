"use client";

import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { thumbs } from "@dicebear/collection";
import { cn } from "@/lib/cn";

export interface AvatarProps {
  seed: string;
  name: string;
  size?: number;
  className?: string;
}

/**
 * Client-generated DiceBear avatar (no network round-trip). The image is
 * decorative (`alt=""` + `aria-hidden`) — the person's name must always be
 * rendered as adjacent visible text by the caller, and is used here only as
 * a native `title` tooltip for sighted mouse users.
 */
export function Avatar({ seed, name, size = 32, className }: AvatarProps) {
  const dataUri = useMemo(() => createAvatar(thumbs, { seed }).toDataUri(), [seed]);

  return (
    <img
      src={dataUri}
      alt=""
      aria-hidden="true"
      title={name}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn("shrink-0 rounded-full border border-border bg-surface-2", className)}
    />
  );
}
