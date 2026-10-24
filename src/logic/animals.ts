// Rules about animals that go beyond simple placing.

import { GRID } from '../config';
import { animalRect, canPlaceAnimal, itemAt, type Catalogue, type PlacedAnimal, type Square, type Zoo } from './zoo';

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

/** True if this animal must be in water but is not standing entirely on pool or pond squares. */
export function needsWater(zoo: Zoo, catalogue: Catalogue, animal: PlacedAnimal): boolean {
  if (!catalogue.livesInWater(animal.animalId)) return false;
  const { col, row, width, height } = animalRect(animal, catalogue);
  for (let c = col; c < col + width; c++) {
    for (let r = row; r < row + height; r++) {
      const item = itemAt(zoo, catalogue, c, r);
      if (!item || !catalogue.isWaterKind(item.kind)) return true;
    }
  }
  return false;
}
