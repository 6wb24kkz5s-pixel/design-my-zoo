// Enclosure detection (GDD section 10): which areas are fully surrounded by fences,
// and where the gaps are in an area that is almost closed.
//
// Movement checks step in all 8 directions, so an animal can squeeze between two
// fence pieces that only touch at their corners: a diagonal gap counts as a gap.
// Fences joined up/down/left/right (as painted strokes always are) still enclose.
// The visitor path counts as outside. Items are not walls.

import { ENCLOSURE, GRID } from '../config';
import { parseSquareKey, squareKey, type Square, type SquareMap } from './zoo';

export type AreaCheck =
  /** The square is inside an enclosure: these are all its squares. */
  | { kind: 'closed'; squares: Square[] }
  /** Not closed, but filling these gap squares would close it. */
  | { kind: 'gap'; gaps: Square[] }
  /** Not closed, and no small gaps to fill (e.g. an open field). */
  | { kind: 'open' }
  /** The square is a fence or not in the building area. */
  | { kind: 'none' };

const MIN = GRID.pathWidth;
const MAX_COL = GRID.cols - GRID.pathWidth - 1;
const MAX_ROW = GRID.rows - GRID.pathWidth - 1;

const STEPS_8 = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const;

type IsWall = (col: number, row: number) => boolean;

interface Region {
  squares: Square[];
  keys: Set<string>;
  /** True if it reaches the edge of the building area, i.e. animals could walk out to the path. */
  open: boolean;
}

function inBuildingArea(col: number, row: number): boolean {
  return col >= MIN && col <= MAX_COL && row >= MIN && row <= MAX_ROW;
}

function onEdge(col: number, row: number): boolean {
  return col === MIN || col === MAX_COL || row === MIN || row === MAX_ROW;
}

/** Every square reachable from `start` without crossing a wall. */
function flood(start: Square, isWall: IsWall): Region {
  const keys = new Set([squareKey(start.col, start.row)]);
  const squares: Square[] = [start];
  let open = false;
  for (let i = 0; i < squares.length; i++) {
    const { col, row } = squares[i] as Square;
    if (onEdge(col, row)) open = true;
    for (const [dc, dr] of STEPS_8) {
      const c = col + dc;
      const r = row + dr;
      const key = squareKey(c, r);
      if (!inBuildingArea(c, r) || isWall(c, r) || keys.has(key)) continue;
      keys.add(key);
      squares.push({ col: c, row: r });
    }
  }
  return { squares, keys, open };
}

/** Every square reachable from `square` without crossing a fence: its enclosure, or the open area around it. */
export function regionOf(fences: SquareMap, square: Square): Square[] {
  const isFence: IsWall = (c, r) => fences[squareKey(c, r)] !== undefined;
  if (!inBuildingArea(square.col, square.row) || isFence(square.col, square.row)) return [];
  return flood(square, isFence).squares;
}

/** Every area that is fully surrounded by fences. */
export function findEnclosures(fences: SquareMap): Square[][] {
  const isFence: IsWall = (c, r) => fences[squareKey(c, r)] !== undefined;
  const seen = new Set<string>();
  const enclosures: Square[][] = [];
  for (let col = MIN; col <= MAX_COL; col++) {
    for (let row = MIN; row <= MAX_ROW; row++) {
      const key = squareKey(col, row);
      if (seen.has(key) || isFence(col, row)) continue;
      const region = flood({ col, row }, isFence);
      for (const k of region.keys) seen.add(k);
      if (!region.open) enclosures.push(region.squares);
    }
  }
  return enclosures;
}

/** Is this square inside an enclosure? If not, where are the gaps? */
export function checkArea(fences: SquareMap, square: Square, maxGapWidth: number = ENCLOSURE.maxGapWidth): AreaCheck {
  const isFence: IsWall = (c, r) => fences[squareKey(c, r)] !== undefined;
  if (!inBuildingArea(square.col, square.row) || isFence(square.col, square.row)) return { kind: 'none' };

  const region = flood(square, isFence);
  if (!region.open) return { kind: 'closed', squares: region.squares };

  for (let width = 1; width <= maxGapWidth; width++) {
    const gaps = gapsAtWidth(isFence, square, region, width);
    if (gaps) return { kind: 'gap', gaps };
  }
  return { kind: 'open' };
}

/**
 * Imagines every opening up to `width` squares wide filled in. If that closes the
 * area around `square`, returns the filled squares that face the outside: the gaps.
 * Openings that only lead somewhere else inside (narrow corridors) are left open,
 * so they are never reported as gaps.
 */
function gapsAtWidth(isFence: IsWall, square: Square, region: Region, width: number): Square[] | null {
  const plugs = new Set([...pinchSquares(isFence, width)].filter((key) => region.keys.has(key)));
  plugs.delete(squareKey(square.col, square.row));
  if (plugs.size === 0) return null;

  // With every opening filled, which parts of the area still reach the path?
  const pluggedWall: IsWall = (c, r) => isFence(c, r) || plugs.has(squareKey(c, r));
  const outside = new Set<string>();
  const labelled = new Set<string>();
  for (const s of region.squares) {
    const key = squareKey(s.col, s.row);
    if (labelled.has(key) || plugs.has(key)) continue;
    const part = flood(s, pluggedWall);
    for (const k of part.keys) labelled.add(k);
    if (part.open) for (const k of part.keys) outside.add(k);
  }
  if (outside.has(squareKey(square.col, square.row))) return null;

  // Only openings next to the outside are real gaps; the rest are passages inside.
  const facesOutside = (key: string) => {
    const s = parseKey(key);
    return STEPS_8.some(([dc, dr]) => outside.has(squareKey(s.col + dc, s.row + dr)));
  };
  const gapKeys = new Set([...plugs].filter(facesOutside));
  const innerWall: IsWall = (c, r) => isFence(c, r) || gapKeys.has(squareKey(c, r));
  const inner = flood(square, innerWall);
  if (inner.open) return null;

  const gaps = [...gapKeys]
    .map(parseKey)
    .filter((s) => STEPS_8.some(([dc, dr]) => inner.keys.has(squareKey(s.col + dc, s.row + dr))));
  return gaps.length > 0 ? gaps : null;
}

/**
 * Squares in an opening up to `width` wide: between two fences in the same row or
 * column, or in the corner between two fences that touch only diagonally.
 */
function pinchSquares(isFence: IsWall, width: number): Set<string> {
  const pinches = new Set<string>();
  for (let col = MIN; col <= MAX_COL; col++) {
    for (let row = MIN; row <= MAX_ROW; row++) {
      if (isFence(col, row)) continue;
      if (
        betweenFences(isFence, col, row, 1, 0, width) ||
        betweenFences(isFence, col, row, 0, 1, width) ||
        diagonalCorner(isFence, col, row)
      ) {
        pinches.add(squareKey(col, row));
      }
    }
  }
  return pinches;
}

/** True if there are fences on both sides along one line, with at most `width` open squares between them. */
function betweenFences(isFence: IsWall, col: number, row: number, dc: number, dr: number, width: number): boolean {
  const distance = (sign: number) => {
    for (let d = 1; d <= width; d++) {
      if (isFence(col + sign * dc * d, row + sign * dr * d)) return d;
    }
    return null;
  };
  const before = distance(-1);
  const after = distance(1);
  return before !== null && after !== null && before + after - 1 <= width;
}

/** True if this square sits in the corner of two fences that touch only diagonally (a diagonal gap). */
function diagonalCorner(isFence: IsWall, col: number, row: number): boolean {
  return STEPS_8.slice(4).some(
    ([dc, dr]) => isFence(col + dc, row) && isFence(col, row + dr) && !isFence(col + dc, row + dr),
  );
}

function parseKey(key: string): Square {
  return parseSquareKey(key) as Square;
}
