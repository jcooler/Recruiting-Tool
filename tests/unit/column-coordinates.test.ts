import { describe, expect, it } from "vitest";
import { columnCoordinates } from "@/components/pipeline/column-coordinates";
import { STAGES, type Stage } from "@/lib/types";

// Five 288px-wide columns laid out left-to-right with no gap, matching
// BoardView's real column order (STAGES). Each column's ClientRect only
// needs the fields columnCoordinates actually reads (left/width); the rest
// of the DOMRect shape is irrelevant to this pure function.
const COLUMN_WIDTH = 288;

function makeRect(left: number, width = COLUMN_WIDTH) {
  return { left, width, top: 0, height: 100, right: left + width, bottom: 100, x: left, y: 0 } as DOMRect;
}

function makeDroppableContainers(rects: Partial<Record<Stage, DOMRect | null>> = {}) {
  const map = new Map<Stage, { id: Stage; rect: { current: DOMRect | null } }>();
  STAGES.forEach((stage, i) => {
    const rect = stage in rects ? (rects[stage] ?? null) : makeRect(i * COLUMN_WIDTH);
    map.set(stage, { id: stage, rect: { current: rect } });
  });
  return map;
}

function makeEvent(key: string) {
  let defaultPrevented = false;
  return {
    key,
    preventDefault: () => {
      defaultPrevented = true;
    },
    get defaultPrevented() {
      return defaultPrevented;
    },
  } as unknown as KeyboardEvent;
}

function callAt(key: string, columnIndex: number, droppableContainers = makeDroppableContainers()) {
  const collisionRect = makeRect(columnIndex * COLUMN_WIDTH);
  const event = makeEvent(key);
  const result = columnCoordinates(event, {
    active: "cand-1",
    currentCoordinates: { x: collisionRect.left, y: collisionRect.top },
    context: {
      activatorEvent: null,
      active: null,
      activeNode: null,
      collisionRect,
      collisions: null,
      draggableNodes: new Map(),
      draggingNode: null,
      draggingNodeRect: null,
      droppableRects: new Map(),
      droppableContainers: droppableContainers as never,
      over: null,
      scrollableAncestors: [],
      scrollAdjustedTranslate: null,
    },
  });
  return { result, event };
}

describe("columnCoordinates", () => {
  it("moves one column right on ArrowRight", () => {
    const { result } = callAt("ArrowRight", 0);
    expect(result).toEqual({ x: 1 * COLUMN_WIDTH, y: 0 });
  });

  it("moves one column left on ArrowLeft", () => {
    const { result } = callAt("ArrowLeft", 2);
    expect(result).toEqual({ x: 1 * COLUMN_WIDTH, y: 0 });
  });

  it("clamps at the last column — ArrowRight from the final stage is a no-op", () => {
    const { result } = callAt("ArrowRight", STAGES.length - 1);
    expect(result).toBeUndefined();
  });

  it("clamps at the first column — ArrowLeft from the first stage is a no-op", () => {
    const { result } = callAt("ArrowLeft", 0);
    expect(result).toBeUndefined();
  });

  it("ArrowUp/ArrowDown never move columns but still consume the event", () => {
    const up = callAt("ArrowUp", 1);
    const down = callAt("ArrowDown", 1);
    expect(up.result).toBeUndefined();
    expect(down.result).toBeUndefined();
    expect(up.event.defaultPrevented).toBe(true);
    expect(down.event.defaultPrevented).toBe(true);
  });

  it("ignores non-arrow keys and does not call preventDefault", () => {
    const { result, event } = callAt("Tab", 1);
    expect(result).toBeUndefined();
    expect(event.defaultPrevented).toBe(false);
  });

  it("returns undefined (no throw) when collisionRect is null — e.g. before the first measurement", () => {
    const event = makeEvent("ArrowRight");
    const result = columnCoordinates(event, {
      active: "cand-1",
      currentCoordinates: { x: 0, y: 0 },
      context: {
        activatorEvent: null,
        active: null,
        activeNode: null,
        collisionRect: null,
        collisions: null,
        draggableNodes: new Map(),
        draggingNode: null,
        draggingNodeRect: null,
        droppableRects: new Map(),
        droppableContainers: makeDroppableContainers() as never,
        over: null,
        scrollableAncestors: [],
        scrollAdjustedTranslate: null,
      },
    });
    expect(result).toBeUndefined();
    expect(event.defaultPrevented).toBe(false);
  });

  it("skips columns that haven't been measured yet (rect.current is null)", () => {
    // "screening" unmeasured — the remaining 4 columns should still be
    // navigable in their own left-to-right order.
    const containers = makeDroppableContainers({ screening: null });
    const { result } = callAt("ArrowRight", 0, containers);
    // applied (0) -> next measured column is interview (index 2 in COLUMN_WIDTH terms)
    expect(result).toEqual({ x: 2 * COLUMN_WIDTH, y: 0 });
  });
});
