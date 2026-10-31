import { describe, expect, it } from 'vitest';
import { GRID } from '../src/config';
import { featureCatalogue as catalogue } from '../src/data/content';
import { findFreeItemSpot } from '../src/logic/animals';
import { canPlace, EMPTY_ZOO, placeItem, type Square, type Zoo } from '../src/logic/zoo';

const middle: Square = { col: GRID.cols / 2, row: GRID.rows / 2 };

function mustPlace(zoo: Zoo, kind: string, col: number, row: number, material?: string): Zoo {
  const next = placeItem(zoo, catalogue, kind, col, row, material);
  if (!next) throw new Error(`could not place ${kind} at ${col},${row}`);
  return next;
}

describe('finding a free spot for an item', () => {
  it('puts a 1×1 item on the square at the middle of the view', () => {
    const spot = findFreeItemSpot(EMPTY_ZOO, catalogue, 'bushes', { col: 10.5, row: 8.5 });
    expect(spot).toEqual({ col: 10, row: 8 });
  });

  it('centres a bigger item on the middle of the view', () => {
    const spot = findFreeItemSpot(EMPTY_ZOO, catalogue, 'deep_pool', { col: 10.5, row: 8.5 });
    expect(spot).toEqual({ col: 9, row: 7 }); // 3×3: its middle is square 10, 8
  });

  it('always returns a spot where the item really fits', () => {
    for (const kind of ['deep_pool', 'hut', 'hollow_log', 'bushes', 'rock_cave']) {
      const spot = findFreeItemSpot(EMPTY_ZOO, catalogue, kind, middle);
      expect(spot, kind).not.toBeNull();
      expect(canPlace(EMPTY_ZOO, catalogue, kind, spot!.col, spot!.row), kind).toBe(true);
    }
  });

  it('keeps off things that are already there', () => {
    const zoo = mustPlace(EMPTY_ZOO, 'bushes', 10, 8);
    const spot = findFreeItemSpot(zoo, catalogue, 'bushes', { col: 10.5, row: 8.5 });
    expect(spot).not.toBeNull();
    expect(spot).not.toEqual({ col: 10, row: 8 });
    expect(Math.abs(spot!.col - 10) + Math.abs(spot!.row - 8)).toBe(1); // the next square along
  });

  it('keeps off fences', () => {
    const fences = { '10,8': 'wood' };
    const spot = findFreeItemSpot({ ...EMPTY_ZOO, fences }, catalogue, 'bushes', { col: 10.5, row: 8.5 });
    expect(spot).not.toEqual({ col: 10, row: 8 });
  });

  it('sends water-only items onto a pool, not the dry middle', () => {
    const zoo = mustPlace(EMPTY_ZOO, 'deep_pool', 3, 3, 'concrete');
    for (const kind of ['water_plants', 'shrimp', 'fish_food', 'floating_island']) {
      const spot = findFreeItemSpot(zoo, catalogue, kind, middle);
      expect(spot, kind).not.toBeNull();
      expect(spot!.col, kind).toBeGreaterThanOrEqual(3);
      expect(spot!.col, kind).toBeLessThanOrEqual(5);
      expect(spot!.row, kind).toBeGreaterThanOrEqual(3);
      expect(spot!.row, kind).toBeLessThanOrEqual(5);
    }
  });

  it('finds no spot for a water-only item when there is no pool', () => {
    expect(findFreeItemSpot(EMPTY_ZOO, catalogue, 'water_plants', middle)).toBeNull();
  });

  it('finds no spot for a water-only item when the pool is already covered', () => {
    let zoo = mustPlace(EMPTY_ZOO, 'shallow_pond', 3, 3, 'concrete'); // 3×2 = 6 squares
    for (let i = 0; i < 6; i++) {
      const spot = findFreeItemSpot(zoo, catalogue, 'water_plants', middle);
      expect(spot).not.toBeNull();
      zoo = mustPlace(zoo, 'water_plants', spot!.col, spot!.row);
    }
    expect(findFreeItemSpot(zoo, catalogue, 'water_plants', middle)).toBeNull();
  });

  it('finds no spot when the plot is full', () => {
    let zoo = EMPTY_ZOO;
    for (;;) {
      const spot = findFreeItemSpot(zoo, catalogue, 'deep_pool', middle);
      if (!spot) break;
      zoo = mustPlace(zoo, 'deep_pool', spot.col, spot.row, 'concrete');
    }
    expect(zoo.items.length).toBeGreaterThan(10);
    expect(findFreeItemSpot(zoo, catalogue, 'deep_pool', middle)).toBeNull();
  });

  it('finds no spot for a kind it does not know', () => {
    expect(findFreeItemSpot(EMPTY_ZOO, catalogue, 'spaceship', middle)).toBeNull();
  });
});
