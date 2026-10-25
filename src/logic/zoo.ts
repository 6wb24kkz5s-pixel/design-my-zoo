// The zoo layout as plain data, with rules for placing, moving and removing things.
// Every change returns a new Zoo, so Undo can keep old ones.

import { GRID } from '../config';
import type { MaterialCheck } from './materials';

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
  /** An animal's size by its id (e.g. "hippopotamus"). */
  animalSizeOf(animalId: string): Size | undefined;
  /** True for items that hold water: pools and ponds. */
  isWaterKind(kind: string): boolean;
  /** True for animals that must be in water (the fish). */
  livesInWater(animalId: string): boolean;
  /** "water" if this kind can only be placed on pool or pond squares. */
  placeOn(kind: string): 'water' | null;
  /** The material ids this kind can be made of. Empty if there is no material choice. */
  materialsFor(kind: string): readonly string[];
  /** Does this material suit this job (a kind, "fence" or "roof")? */
  materialCheck(job: string, materialId: string): MaterialCheck;
  isRoofMaterial(id: string): boolean;
}

export interface PlacedItem {
  readonly id: number;
  readonly kind: string;
  /** Top-left square. */
  readonly col: number;
  readonly row: number;
  /** What it is made of, for kinds with a material choice. */
  readonly material?: string;
}

/** An animal in the zoo. Each animal can be added once, so its id is its name in the data file. */
export interface PlacedAnimal {
  readonly animalId: string;
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
  /** Roof material per square. A roof covers a whole enclosure. */
  readonly roofs: SquareMap;
  readonly animals: readonly PlacedAnimal[];
}

export const EMPTY_ZOO: Zoo = { items: [], nextId: 1, ground: {}, fences: {}, roofs: {}, animals: [] };

/** True if nothing has been placed or painted. */
export function isEmptyZoo(zoo: Zoo): boolean {
  return (
    zoo.items.length === 0 &&
    zoo.animals.length === 0 &&
    Object.keys(zoo.ground).length === 0 &&
    Object.keys(zoo.fences).length === 0 &&
    Object.keys(zoo.roofs).length === 0
  );
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

function within(inner: Rect, outer: Rect): boolean {
  return (
    inner.col >= outer.col &&
    inner.row >= outer.row &&
    inner.col + inner.width <= outer.col + outer.width &&
    inner.row + inner.height <= outer.row + outer.height
  );
}

function rectOf(item: PlacedItem, catalogue: Catalogue): Rect {
  const [width, height] = catalogue.sizeOf(item.kind) ?? [1, 1];
  return { col: item.col, row: item.row, width, height };
}

/** The squares an animal covers. */
export function animalRect(animal: PlacedAnimal, catalogue: Catalogue): Rect {
  const [width, height] = catalogue.animalSizeOf(animal.animalId) ?? [1, 1];
  return { col: animal.col, row: animal.row, width, height };
}

function hasFence(zoo: Zoo, rect: Rect): boolean {
  for (let col = rect.col; col < rect.col + rect.width; col++) {
    for (let row = rect.row; row < rect.row + rect.height; row++) {
      if (zoo.fences[squareKey(col, row)] !== undefined) return true;
    }
  }
  return false;
}

function squaresOf(rect: Rect): Rect[] {
  const squares: Rect[] = [];
  for (let col = rect.col; col < rect.col + rect.width; col++) {
    for (let row = rect.row; row < rect.row + rect.height; row++) {
      squares.push({ col, row, width: 1, height: 1 });
    }
  }
  return squares;
}

/** Every item covering this square. A pool and the plant floating on it both cover the same square. */
export function itemsAt(zoo: Zoo, catalogue: Catalogue, col: number, row: number): PlacedItem[] {
  const square = { col, row, width: 1, height: 1 };
  return zoo.items.filter((item) => overlaps(square, rectOf(item, catalogue)));
}

/** The item on top at this square: a water-only item if there is one, otherwise whatever is there. */
export function itemAt(zoo: Zoo, catalogue: Catalogue, col: number, row: number): PlacedItem | undefined {
  const all = itemsAt(zoo, catalogue, col, row);
  return all.find((item) => catalogue.placeOn(item.kind) !== null) ?? all[0];
}

/** The material a new item gets if none is chosen: the first allowed one that works for the job. */
export function defaultMaterial(catalogue: Catalogue, kind: string): string | undefined {
  const allowed = catalogue.materialsFor(kind);
  return allowed.find((id) => catalogue.materialCheck(kind, id).works) ?? allowed[0];
}

/** True if every square this kind would cover is on a pool or pond. */
export function isOnWater(zoo: Zoo, catalogue: Catalogue, kind: string, col: number, row: number): boolean {
  const size = catalogue.sizeOf(kind);
  if (!size) return false;
  return squaresOf({ col, row, width: size[0], height: size[1] }).every((s) =>
    itemsAt(zoo, catalogue, s.col, s.row).some((i) => catalogue.isWaterKind(i.kind)),
  );
}

function canPlaceIgnoring(
  zoo: Zoo,
  catalogue: Catalogue,
  kind: string,
  col: number,
  row: number,
  ignore: ReadonlySet<number>,
): boolean {
  const size = catalogue.sizeOf(kind);
  if (!size) return false;
  const rect = { col, row, width: size[0], height: size[1] };
  if (!insideBuildingArea(rect) || hasFence(zoo, rect)) return false;

  const others = zoo.items.filter((item) => !ignore.has(item.id));
  if (catalogue.placeOn(kind) === 'water') {
    // Water-only items sit on pool squares, one per square.
    return squaresOf(rect).every((square) => {
      const covering = others.filter((item) => overlaps(square, rectOf(item, catalogue)));
      return (
        covering.some((item) => catalogue.isWaterKind(item.kind)) &&
        !covering.some((item) => catalogue.placeOn(item.kind) !== null)
      );
    });
  }
  return others.every((item) => !overlaps(rect, rectOf(item, catalogue)));
}

/**
 * True if an item of this kind fits with its top-left at (col, row):
 * inside the building area, not on a fence, and not overlapping another item.
 * Water-only items (plants, islands, shrimp, fish food) must be on pool squares instead.
 * Animals do not block items: they stand on top of them.
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
  return canPlaceIgnoring(zoo, catalogue, kind, col, row, new Set(ignoreId === undefined ? [] : [ignoreId]));
}

/**
 * Adds a new item, or returns null if it does not fit or the material is not allowed.
 * Kinds with a material choice get `material`, or a sensible default if none is given.
 */
export function placeItem(
  zoo: Zoo,
  catalogue: Catalogue,
  kind: string,
  col: number,
  row: number,
  material?: string,
): Zoo | null {
  if (!canPlace(zoo, catalogue, kind, col, row)) return null;
  const allowed = catalogue.materialsFor(kind);
  let chosen: string | undefined;
  if (allowed.length > 0) {
    chosen = material ?? defaultMaterial(catalogue, kind);
    if (chosen === undefined || !allowed.includes(chosen)) return null;
  }
  const item: PlacedItem = { id: zoo.nextId, kind, col, row, ...(chosen === undefined ? {} : { material: chosen }) };
  return { ...zoo, items: [...zoo.items, item], nextId: zoo.nextId + 1 };
}

/** Changes what an item is made of, or returns null if the material is not allowed or is unchanged. */
export function setItemMaterial(zoo: Zoo, catalogue: Catalogue, id: number, material: string): Zoo | null {
  const item = zoo.items.find((i) => i.id === id);
  if (!item || item.material === material || !catalogue.materialsFor(item.kind).includes(material)) return null;
  return { ...zoo, items: zoo.items.map((i) => (i.id === id ? { ...i, material } : i)) };
}

/** The water-only items floating on a pool or pond. They travel with it. */
function itemsOnPool(zoo: Zoo, catalogue: Catalogue, pool: PlacedItem): PlacedItem[] {
  if (!catalogue.isWaterKind(pool.kind)) return [];
  const poolRect = rectOf(pool, catalogue);
  return zoo.items.filter(
    (i) => i.id !== pool.id && catalogue.placeOn(i.kind) !== null && within(rectOf(i, catalogue), poolRect),
  );
}

/** True if the item (with anything floating on it) fits with its top-left at (col, row). */
export function canMoveItem(zoo: Zoo, catalogue: Catalogue, id: number, col: number, row: number): boolean {
  const item = zoo.items.find((i) => i.id === id);
  if (!item) return false;
  const ignore = new Set([id, ...itemsOnPool(zoo, catalogue, item).map((i) => i.id)]);
  return canPlaceIgnoring(zoo, catalogue, item.kind, col, row, ignore);
}

/**
 * Moves an item, or returns null if it does not fit there or did not move.
 * Anything floating on a pool moves with it.
 */
export function moveItem(zoo: Zoo, catalogue: Catalogue, id: number, col: number, row: number): Zoo | null {
  const item = zoo.items.find((i) => i.id === id);
  if (!item || (item.col === col && item.row === row)) return null;
  if (!canMoveItem(zoo, catalogue, id, col, row)) return null;

  const dc = col - item.col;
  const dr = row - item.row;
  const travelling = new Set([id, ...itemsOnPool(zoo, catalogue, item).map((i) => i.id)]);
  return {
    ...zoo,
    items: zoo.items.map((i) => (travelling.has(i.id) ? { ...i, col: i.col + dc, row: i.row + dr } : i)),
  };
}

/** Removes an item (and anything floating on it), or returns null if there is no such item. */
export function removeItem(zoo: Zoo, catalogue: Catalogue, id: number): Zoo | null {
  const item = zoo.items.find((i) => i.id === id);
  if (!item) return null;
  const gone = new Set([id, ...itemsOnPool(zoo, catalogue, item).map((i) => i.id)]);
  return { ...zoo, items: zoo.items.filter((i) => !gone.has(i.id)) };
}

/**
 * True if this animal fits with its top-left at (col, row): inside the building
 * area, not on a fence, and not overlapping another animal. Animals may stand on items.
 * The animal itself is ignored, so it can move onto its own old squares.
 */
export function canPlaceAnimal(zoo: Zoo, catalogue: Catalogue, animalId: string, col: number, row: number): boolean {
  const size = catalogue.animalSizeOf(animalId);
  if (!size) return false;
  const rect = { col, row, width: size[0], height: size[1] };
  if (!insideBuildingArea(rect) || hasFence(zoo, rect)) return false;
  return zoo.animals.every((a) => a.animalId === animalId || !overlaps(rect, animalRect(a, catalogue)));
}

/** Adds an animal, or returns null if it is already in the zoo or does not fit. */
export function placeAnimal(zoo: Zoo, catalogue: Catalogue, animalId: string, col: number, row: number): Zoo | null {
  if (zoo.animals.some((a) => a.animalId === animalId)) return null;
  if (!canPlaceAnimal(zoo, catalogue, animalId, col, row)) return null;
  return { ...zoo, animals: [...zoo.animals, { animalId, col, row }] };
}

/** Moves an animal, or returns null if it does not fit there or did not move. */
export function moveAnimal(zoo: Zoo, catalogue: Catalogue, animalId: string, col: number, row: number): Zoo | null {
  const animal = zoo.animals.find((a) => a.animalId === animalId);
  if (!animal || (animal.col === col && animal.row === row)) return null;
  if (!canPlaceAnimal(zoo, catalogue, animalId, col, row)) return null;
  return { ...zoo, animals: zoo.animals.map((a) => (a.animalId === animalId ? { ...a, col, row } : a)) };
}

/** Takes an animal out of the zoo, or returns null if it is not in it. */
export function removeAnimal(zoo: Zoo, animalId: string): Zoo | null {
  if (!zoo.animals.some((a) => a.animalId === animalId)) return null;
  return { ...zoo, animals: zoo.animals.filter((a) => a.animalId !== animalId) };
}

/** The animal covering this square, if any. */
export function animalAt(zoo: Zoo, catalogue: Catalogue, col: number, row: number): PlacedAnimal | undefined {
  const square = { col, row, width: 1, height: 1 };
  return zoo.animals.find((a) => overlaps(square, animalRect(a, catalogue)));
}
