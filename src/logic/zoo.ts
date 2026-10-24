// The zoo layout as plain data, with rules for placing, moving and removing items.
// Every change returns a new Zoo, so Undo can keep old ones.

import { GRID } from '../config';

/** Width and height in squares. */
export type Size = readonly [number, number];

export interface Square {
  col: number;
  row: number;
}

/** What the rules need to know about the science content. */
export interface Catalogue {
  /** An item's size by its kind (e.g. "deep_pool"). */
  sizeOf(kind: string): Size | undefined;
  isGround(id: string): boolean;
  isFenceMaterial(id: string): boolean;
}

export interface PlacedItem {
  readonly id: number;
  readonly kind: string;
  /** Top-left square. */
  readonly col: number;
  readonly row: number;
}

/** Per-square values, keyed by squareKey(). */
export type SquareMap = Readonly<Record<string, string>>;

export interface Zoo {
  readonly items: readonly PlacedItem[];
  readonly nextId: number;
  /** Painted ground type per square. Unpainted squares are missing. */
  readonly ground: SquareMap;
  /** Fence material per square. A fence fills its whole square. */
  readonly fences: SquareMap;
}

export const EMPTY_ZOO: Zoo = { items: [], nextId: 1, ground: {}, fences: {} };

/** True if nothing has been placed or painted. */
export function isEmptyZoo(zoo: Zoo): boolean {
  return zoo.items.length === 0 && Object.keys(zoo.ground).length === 0 && Object.keys(zoo.fences).length === 0;
}

export function squareKey(col: number, row: number): string {
  return `${col},${row}`;
}

export function parseSquareKey(key: string): Square | null {
  const [col, row] = key.split(',').map(Number);
  return Number.isInteger(col) && Number.isInteger(row) ? { col: col as number, row: row as number } : null;
}

interface Rect {
  col: number;
  row: number;
  width: number;
  height: number;
}

/** True if the whole rectangle is inside the building area (not on the visitor path or off the grid). */
export function insideBuildingArea(rect: Rect): boolean {
  const { cols, rows, pathWidth } = GRID;
  return (
    Number.isInteger(rect.col) &&
    Number.isInteger(rect.row) &&
    rect.col >= pathWidth &&
    rect.row >= pathWidth &&
    rect.col + rect.width <= cols - pathWidth &&
    rect.row + rect.height <= rows - pathWidth
  );
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.col < b.col + b.width && b.col < a.col + a.width && a.row < b.row + b.height && b.row < a.row + a.height;
}

function rectOf(item: PlacedItem, catalogue: Catalogue): Rect {
  const [width, height] = catalogue.sizeOf(item.kind) ?? [1, 1];
  return { col: item.col, row: item.row, width, height };
}

function hasFence(zoo: Zoo, rect: Rect): boolean {
  for (let col = rect.col; col < rect.col + rect.width; col++) {
    for (let row = rect.row; row < rect.row + rect.height; row++) {
      if (zoo.fences[squareKey(col, row)] !== undefined) return true;
    }
  }
  return false;
}

/**
 * True if an item of this kind fits with its top-left at (col, row):
 * inside the building area, not on a fence, and not overlapping anything else.
 * `ignoreId` skips one item, so an item can move onto its own old squares.
 */
export function canPlace(
  zoo: Zoo,
  catalogue: Catalogue,
  kind: string,
  col: number,
  row: number,
  ignoreId?: number,
): boolean {
  const size = catalogue.sizeOf(kind);
  if (!size) return false;
  const rect = { col, row, width: size[0], height: size[1] };
  if (!insideBuildingArea(rect) || hasFence(zoo, rect)) return false;
  return zoo.items.every((item) => item.id === ignoreId || !overlaps(rect, rectOf(item, catalogue)));
}

/** Adds a new item, or returns null if it does not fit. */
export function placeItem(zoo: Zoo, catalogue: Catalogue, kind: string, col: number, row: number): Zoo | null {
  if (!canPlace(zoo, catalogue, kind, col, row)) return null;
  return { ...zoo, items: [...zoo.items, { id: zoo.nextId, kind, col, row }], nextId: zoo.nextId + 1 };
}

/** Moves an item, or returns null if it does not fit there or did not move. */
export function moveItem(zoo: Zoo, catalogue: Catalogue, id: number, col: number, row: number): Zoo | null {
  const item = zoo.items.find((i) => i.id === id);
  if (!item || (item.col === col && item.row === row)) return null;
  if (!canPlace(zoo, catalogue, item.kind, col, row, id)) return null;
  return { ...zoo, items: zoo.items.map((i) => (i.id === id ? { ...i, col, row } : i)) };
}

/** Removes an item, or returns null if there is no such item. */
export function removeItem(zoo: Zoo, id: number): Zoo | null {
  if (!zoo.items.some((i) => i.id === id)) return null;
  return { ...zoo, items: zoo.items.filter((i) => i.id !== id) };
}

/** The item covering this square, if any. */
export function itemAt(zoo: Zoo, catalogue: Catalogue, col: number, row: number): PlacedItem | undefined {
  const square = { col, row, width: 1, height: 1 };
  return zoo.items.find((item) => overlaps(square, rectOf(item, catalogue)));
}
