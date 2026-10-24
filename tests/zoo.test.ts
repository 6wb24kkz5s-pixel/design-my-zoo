import { describe, expect, it } from 'vitest';
import { GRID } from '../src/config';
import { featureCatalogue, featuresInTab, PLACEABLE_FEATURES } from '../src/data/content';
import { canPlace, EMPTY_ZOO, itemAt, moveItem, placeItem, removeItem, type Zoo } from '../src/logic/zoo';
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
    expect(removeItem(zoo, 1)?.items.map((i) => i.id)).toEqual([2]);
    expect(removeItem(zoo, 99)).toBeNull();
  });

  it('finds the item covering a square', () => {
    const zoo = place(EMPTY_ZOO, 'big', 5, 5);
    expect(itemAt(zoo, catalogue, 7, 7)?.id).toBe(1);
    expect(itemAt(zoo, catalogue, 8, 7)).toBeUndefined();
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
