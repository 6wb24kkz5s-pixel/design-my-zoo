// The zoo layout as plain data, with rules for placing, moving and removing items.
// Every change returns a new Zoo, so Undo can keep old ones.

import { GRID } from '../config';

/** Width and height in squares. */
export type Size = readonly [number, number];

/** Looks up an item's size by its kind (e.g. "deep_pool"). */
export interface Catalogue {
  sizeOf(kind: string): Size | undefined;
}

export interface PlacedItem {
  readonly id: number;
  readonly kind: string;
  /** Top-left square. */
  readonly col: number;
  readonly row: number;
}

export interface Zoo {
  readonly items: readonly PlacedItem[];
  readonly nextId: number;
}

export const EMPTY_ZOO: Zoo = { items: [], nextId: 1 };

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

/**
 * True if an item of this kind fits with its top-left at (col, row):
 * inside the building area and not overlapping anything else.
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
  if (!insideBuildingArea(rect)) return false;
  return zoo.items.every((item) => item.id === ignoreId || !overlaps(rect, rectOf(item, catalogue)));
}

/** Adds a new item, or returns null if it does not fit. */
export function placeItem(zoo: Zoo, catalogue: Catalogue, kind: string, col: number, row: number): Zoo | null {
  if (!canPlace(zoo, catalogue, kind, col, row)) return null;
  return { items: [...zoo.items, { id: zoo.nextId, kind, col, row }], nextId: zoo.nextId + 1 };
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
