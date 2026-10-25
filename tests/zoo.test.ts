import { describe, expect, it } from 'vitest';
import { GRID } from '../src/config';
import { featureCatalogue, featuresInTab, PLACEABLE_FEATURES } from '../src/data/content';
import {
  canMoveItem,
  canPlace,
  EMPTY_ZOO,
  itemAt,
  moveItem,
  placeItem,
  removeItem,
  type Zoo,
} from '../src/logic/zoo';
import { fakeCatalogue as catalogue } from './helpers';

const first = GRID.pathWidth;
const lastCol = GRID.cols - GRID.pathWidth - 1;
const lastRow = GRID.rows - GRID.pathWidth - 1;

function place(zoo: Zoo, kind: string, col: number, row: number): Zoo {
  const next = placeItem(zoo, catalogue, kind, col, row);
  if (!next) throw new Error(`could not place ${kind} at ${col},${row}`);
  return next;
}

describe('placing', () => {
  it('places a 1×1 and a 3×3 item in the building area', () => {
    let zoo = place(EMPTY_ZOO, 'small', first, first);
    zoo = place(zoo, 'big', lastCol - 2, lastRow - 2);
    expect(zoo.items).toHaveLength(2);
    expect(zoo.items.map((i) => i.id)).toEqual([1, 2]);
  });

  it('does not place on the visitor path or off the grid', () => {
    expect(canPlace(EMPTY_ZOO, catalogue, 'small', first - 1, first)).toBe(false);
    expect(canPlace(EMPTY_ZOO, catalogue, 'small', first, lastRow + 1)).toBe(false);
    expect(canPlace(EMPTY_ZOO, catalogue, 'big', lastCol - 1, first)).toBe(false);
    expect(canPlace(EMPTY_ZOO, catalogue, 'small', -5, 99)).toBe(false);
  });

  it('does not place on top of another item', () => {
    const zoo = place(EMPTY_ZOO, 'big', 5, 5);
    expect(placeItem(zoo, catalogue, 'small', 7, 7)).toBeNull();
    expect(placeItem(zoo, catalogue, 'wide', 4, 5)).toBeNull();
    expect(placeItem(zoo, catalogue, 'small', 8, 5)).not.toBeNull();
  });

  it('does not place unknown kinds or half squares', () => {
    expect(canPlace(EMPTY_ZOO, catalogue, 'dragon', 5, 5)).toBe(false);
    expect(canPlace(EMPTY_ZOO, catalogue, 'small', 5.5, 5)).toBe(false);
  });
});

describe('moving and removing', () => {
  it('moves an item onto squares that overlap its own old place', () => {
    const zoo = place(EMPTY_ZOO, 'big', 5, 5);
    const moved = moveItem(zoo, catalogue, 1, 6, 6);
    expect(moved?.items[0]).toMatchObject({ col: 6, row: 6 });
  });

  it('does not move an item onto another item, or nowhere', () => {
    let zoo = place(EMPTY_ZOO, 'big', 5, 5);
    zoo = place(zoo, 'small', 10, 10);
    expect(moveItem(zoo, catalogue, 2, 6, 6)).toBeNull();
    expect(moveItem(zoo, catalogue, 2, 10, 10)).toBeNull();
  });

  it('removes an item', () => {
    const zoo = place(place(EMPTY_ZOO, 'small', 3, 3), 'small', 4, 4);
    expect(removeItem(zoo, catalogue, 1)?.items.map((i) => i.id)).toEqual([2]);
    expect(removeItem(zoo, catalogue, 99)).toBeNull();
  });

  it('finds the item covering a square', () => {
    const zoo = place(EMPTY_ZOO, 'big', 5, 5);
    expect(itemAt(zoo, catalogue, 7, 7)?.id).toBe(1);
    expect(itemAt(zoo, catalogue, 8, 7)).toBeUndefined();
  });
});

describe('water-only items and pools', () => {
  const pool = placeItem(EMPTY_ZOO, catalogue, 'pool', 5, 5) as Zoo;

  it('puts water-only items on pool squares, one per square', () => {
    const zoo = place(pool, 'plant', 6, 6);
    expect(placeItem(zoo, catalogue, 'plant', 6, 6)).toBeNull();
    expect(placeItem(zoo, catalogue, 'plant', 7, 7)).not.toBeNull();
    expect(placeItem(pool, catalogue, 'plant', 9, 9)).toBeNull();
    expect(placeItem(EMPTY_ZOO, catalogue, 'plant', 6, 6)).toBeNull();
  });

  it('does not let other items go on a pool', () => {
    expect(placeItem(pool, catalogue, 'small', 6, 6)).toBeNull();
  });

  it('picks up the water-only item on top, not the pool under it', () => {
    const zoo = place(pool, 'plant', 6, 6);
    expect(itemAt(zoo, catalogue, 6, 6)?.kind).toBe('plant');
    expect(itemAt(zoo, catalogue, 5, 5)?.kind).toBe('pool');
  });

  it('carries what floats on a pool when the pool moves', () => {
    const zoo = place(place(pool, 'plant', 6, 6), 'plant', 7, 7);
    const moved = moveItem(zoo, catalogue, 1, 10, 10);
    expect(moved?.items.map((i) => [i.kind, i.col, i.row])).toEqual([
      ['pool', 10, 10],
      ['plant', 11, 11],
      ['plant', 12, 12],
    ]);
    expect(canMoveItem(zoo, catalogue, 1, 6, 6)).toBe(true);
    expect(moveItem(zoo, catalogue, 1, 6, 6)?.items[1]).toMatchObject({ col: 7, row: 7 });
  });

  it('does not move a pool onto another item', () => {
    const zoo = place(place(pool, 'plant', 6, 6), 'small', 10, 10);
    expect(moveItem(zoo, catalogue, 1, 9, 9)).toBeNull();
  });

  it('moves a water-only item to another pool square, but not off the pool', () => {
    const zoo = place(pool, 'plant', 6, 6);
    expect(moveItem(zoo, catalogue, 2, 7, 7)?.items[1]).toMatchObject({ col: 7, row: 7 });
    expect(moveItem(zoo, catalogue, 2, 9, 9)).toBeNull();
  });

  it('removes what floats on a pool along with the pool', () => {
    const zoo = place(place(pool, 'plant', 6, 6), 'small', 12, 12);
    expect(removeItem(zoo, catalogue, 1)?.items.map((i) => i.kind)).toEqual(['small']);
    expect(removeItem(zoo, catalogue, 2)?.items.map((i) => i.kind)).toEqual(['pool', 'small']);
  });

  it('gives a pool a working material by default and keeps a chosen one', () => {
    expect(pool.items[0]?.material).toBe('glass');
    expect(placeItem(EMPTY_ZOO, catalogue, 'pool', 5, 5, 'wood')?.items[0]?.material).toBe('wood');
    expect(placeItem(EMPTY_ZOO, catalogue, 'pool', 5, 5, 'net')).toBeNull();
  });
});

describe('palette items from the data file', () => {
  it('has draggable items in the water, plants, shelter and food tabs', () => {
    for (const tab of ['water', 'plants', 'shelter', 'food']) {
      expect(featuresInTab(tab).length).toBeGreaterThan(0);
    }
  });

  it('leaves painted features (fences) out of the drag-and-drop items', () => {
    expect(featuresInTab('fences')).toEqual([]);
    expect(PLACEABLE_FEATURES.every((f) => featureCatalogue.sizeOf(f.id) !== undefined)).toBe(true);
  });
});
