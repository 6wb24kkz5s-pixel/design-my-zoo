// Where an animal may wander, swim and peek. These are only rules about where it may be seen:
// the animal's saved position, hearts and enclosure checks never change because of them.

import { itemsAt, squareKey, type Catalogue, type PlacedAnimal, type PlacedItem, type Size, type Square, type Zoo } from './zoo';

/** The top-left square of an animal while it moves about. */
export type Cell = Square;

/** The keys of every square an animal of this size covers when its top-left square is `cell`. */
export function rectKeys(cell: Cell, size: Size): string[] {
  const keys: string[] = [];
  for (let col = cell.col; col < cell.col + size[0]; col++) {
    for (let row = cell.row; row < cell.row + size[1]; row++) keys.push(squareKey(col, row));
  }
  return keys;
}

/** True if every square the animal would cover is allowed and free. */
export function fits(cell: Cell, size: Size, allowed: ReadonlySet<string>, blocked: ReadonlySet<string>): boolean {
  return rectKeys(cell, size).every((key) => allowed.has(key) && !blocked.has(key));
}

/**
 * Everywhere an animal could stroll to: not further than `maxDistance` squares from `home`, inside the
 * allowed squares, and not on anything blocked (other animals). The animal's own spot counts if it fits.
 */
export function strollOptions(
  home: Cell,
  size: Size,
  allowed: ReadonlySet<string>,
  blocked: ReadonlySet<string>,
  maxDistance: number,
): Cell[] {
  const options: Cell[] = [];
  for (let dr = -maxDistance; dr <= maxDistance; dr++) {
    for (let dc = -maxDistance; dc <= maxDistance; dc++) {
      const cell = { col: home.col + dc, row: home.row + dr };
      if (fits(cell, size, allowed, blocked)) options.push(cell);
    }
  }
  return options;
}

/**
 * The squares to walk through to get from one spot to another, one step up, down, left or right at a
 * time, never leaving the allowed squares or touching a blocked one. Empty if already there; null if
 * there is no way.
 */
export function findPath(
  from: Cell,
  to: Cell,
  size: Size,
  allowed: ReadonlySet<string>,
  blocked: ReadonlySet<string>,
): Cell[] | null {
  if (from.col === to.col && from.row === to.row) return [];
  if (!fits(to, size, allowed, blocked)) return null;

  const key = (c: Cell) => squareKey(c.col, c.row);
  const cameFrom = new Map<string, Cell | null>([[key(from), null]]);
  const queue: Cell[] = [from];
  for (let i = 0; i < queue.length; i++) {
    const here = queue[i] as Cell;
    if (here.col === to.col && here.row === to.row) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const next = { col: here.col + dc, row: here.row + dr };
      if (cameFrom.has(key(next)) || !fits(next, size, allowed, blocked)) continue;
      cameFrom.set(key(next), here);
      queue.push(next);
    }
  }
  if (!cameFrom.has(key(to))) return null;

  const path: Cell[] = [];
  for (let cell: Cell | null | undefined = to; cell && key(cell) !== key(from); cell = cameFrom.get(key(cell))) path.unshift(cell);
  return path;
}

/** The squares of the pool or pond a fish is swimming in, if it really holds water. Empty if the fish is not in water. */
export function swimSquares(zoo: Zoo, catalogue: Catalogue, animal: PlacedAnimal): Set<string> {
  const pool: PlacedItem | undefined = itemsAt(zoo, catalogue, animal.col, animal.row).find(
    (item) =>
      catalogue.isWaterKind(item.kind) && (!item.material || catalogue.materialCheck(item.kind, item.material).works),
  );
  if (!pool) return new Set();
  const [width, height] = catalogue.sizeOf(pool.kind) ?? [1, 1];
  return new Set(rectKeys({ col: pool.col, row: pool.row }, [width, height]));
}

/** Where to go to look out of a gap: the spot on the animal's own side, and the gap square itself. */
export interface PeekPlan {
  approach: Cell;
  gap: Cell;
}

/**
 * The nearest gap to look out of. The animal walks to a square next to the gap (on its own side),
 * then steps into the gap square and no further. Null if there is nowhere to go.
 */
export function peekPlan(
  inner: ReadonlySet<string>,
  gaps: readonly Square[],
  from: Cell,
  blocked: ReadonlySet<string>,
): PeekPlan | null {
  const one: Size = [1, 1];
  let best: (PeekPlan & { distance: number }) | null = null;
  for (const gap of gaps) {
    if (blocked.has(squareKey(gap.col, gap.row))) continue;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue;
        const approach = { col: gap.col + dc, row: gap.row + dr };
        if (!fits(approach, one, inner, blocked)) continue;
        const distance = Math.max(Math.abs(approach.col - from.col), Math.abs(approach.row - from.row));
        if (!best || distance < best.distance) best = { approach, gap, distance };
      }
    }
  }
  return best ? { approach: best.approach, gap: best.gap } : null;
}
