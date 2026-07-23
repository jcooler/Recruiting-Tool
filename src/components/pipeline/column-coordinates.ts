import type { KeyboardCoordinateGetter } from "@dnd-kit/core";
import { STAGES, type Stage } from "@/lib/types";

// Arrow keys jump the dragged card between column centers (true keyboard drag).
//
// Split out of board-view.tsx (JSX-free, like src/components/ui/toast.tsx)
// purely so this pure function can be unit tested: board-view.tsx imports
// board-column.tsx and candidate-card.tsx, both full of literal JSX, and
// Vitest's plain esbuild transform can't parse that under this repo's
// `"jsx": "preserve"` tsconfig (see toast.tsx's own comment for the identical
// constraint). See tests/unit/column-coordinates.test.ts.
//
// Deviation from the task-24 brief's verbatim BoardView snippet: the brief
// destructured `{ droppableContainers, collisionRect }` straight off this
// getter's second argument. dnd-kit's `KeyboardCoordinateGetter` type — and
// KeyboardSensor's actual call site, `coordinateGetter(event, { active,
// context: context.current, currentCoordinates })` in
// @dnd-kit/core/dist/core.esm.js — only puts `active`/`currentCoordinates`/
// `context` at that top level; `droppableContainers` and `collisionRect` live
// one level down, on `context`. Destructuring them directly as written would
// silently equal `undefined` on every call, so `if (!collisionRect) return;`
// would fire unconditionally and arrow-key column jumps could never work.
// Fixed minimally by destructuring `context` first, then pulling the same two
// fields off it — everything downstream is untouched.
export const columnCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  const { droppableContainers, collisionRect } = context;
  if (!collisionRect) return;
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
  event.preventDefault();
  const columns = STAGES
    .map((s) => droppableContainers.get(s))
    .filter((c) => c?.rect.current)
    .map((c) => ({ id: c!.id as Stage, rect: c!.rect.current! }));
  const currentX = collisionRect.left + collisionRect.width / 2;
  const sorted = columns.sort((a, b) => a.rect.left - b.rect.left);
  const currentIdx = sorted.findIndex((c) => currentX >= c.rect.left && currentX <= c.rect.left + c.rect.width);
  const nextIdx = event.key === "ArrowLeft" ? Math.max(0, currentIdx - 1)
    : event.key === "ArrowRight" ? Math.min(sorted.length - 1, currentIdx + 1)
    : currentIdx;
  if (nextIdx === currentIdx || nextIdx < 0) return;
  const target = sorted[nextIdx].rect;
  return { x: target.left + target.width / 2 - collisionRect.width / 2, y: collisionRect.top };
};
