// Rules about animals that go beyond simple placing.

import { GRID } from '../config';
import {
  animalRect,
  canPlace,
  canPlaceAnimal,
  itemsAt,
  type Catalogue,
  type PlacedAnimal,
  type PlacedItem,
  type Square,
  type Zoo,
} from './zoo';

/**
 * The best free spot for a new animal, as its top-left square: the one whose
 * middle is closest to `near`, or null if the animal does not fit anywhere.
 */
export function findFreeSpot(zoo: Zoo, catalogue: Catalogue, animalId: string, near: Square): Square | null {
  const size = catalogue.animalSizeOf(animalId);
  if (!size) return null;

  let best: Square | null = null;
  let bestDistance = Infinity;
  for (let row = 0; row < GRID.rows; row++) {
    for (let col = 0; col < GRID.cols; col++) {
      if (!canPlaceAnimal(zoo, catalogue, animalId, col, row)) continue;
      const distance = (col + size[0] / 2 - near.col) ** 2 + (row + size[1] / 2 - near.row) ** 2;
      if (distance < bestDistance) {
        best = { col, row };
        bestDistance = distance;
      }
    }
  }
  return best;
}

/**
 * The best free spot for a new item from the palette, as its top-left square: the one whose middle is
 * closest to `near`, or null if it fits nowhere. Water-only items (plants, island, shrimp, fish food)
 * only fit on a pool, so for them this finds a free square of water.
 */
export function findFreeItemSpot(zoo: Zoo, catalogue: Catalogue, kind: string, near: Square): Square | null {
  const size = catalogue.sizeOf(kind);
  if (!size) return null;

  let best: Square | null = null;
  let bestDistance = Infinity;
  for (let row = 0; row < GRID.rows; row++) {
    for (let col = 0; col < GRID.cols; col++) {
      const distance = (col + size[0] / 2 - near.col) ** 2 + (row + size[1] / 2 - near.row) ** 2;
      if (distance >= bestDistance) continue; // cheaper than asking canPlace first
      if (!canPlace(zoo, catalogue, kind, col, row)) continue;
      best = { col, row };
      bestDistance = distance;
    }
  }
  return best;
}

/** A pool or pond that is not made of a waterproof material leaks, so it holds no water. */
function holdsWater(catalogue: Catalogue, pool: PlacedItem): boolean {
  return !pool.material || catalogue.materialCheck(pool.kind, pool.material).works;
}

/**
 * True if this animal must be in water but is not standing entirely on pool or
 * pond squares that hold water.
 */
export function needsWater(zoo: Zoo, catalogue: Catalogue, animal: PlacedAnimal): boolean {
  if (!catalogue.livesInWater(animal.animalId)) return false;
  const { col, row, width, height } = animalRect(animal, catalogue);
  for (let c = col; c < col + width; c++) {
    for (let r = row; r < row + height; r++) {
      const wet = itemsAt(zoo, catalogue, c, r).some((i) => catalogue.isWaterKind(i.kind) && holdsWater(catalogue, i));
      if (!wet) return true;
    }
  }
  return false;
}
