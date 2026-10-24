import type { Catalogue, Size } from '../src/logic/zoo';

// Made-up kinds, ground, materials and animals so rules tests do not depend on the science data.
const sizes: Record<string, Size> = { small: [1, 1], big: [3, 3], wide: [2, 1], pool: [3, 3] };
const animalSizes: Record<string, Size> = { fish: [1, 1], cow: [2, 2], lizard: [2, 1], bird: [1, 1] };

export const fakeCatalogue: Catalogue = {
  sizeOf: (kind) => sizes[kind],
  isGround: (id) => id === 'grass' || id === 'soil',
  isFenceMaterial: (id) => id === 'wood' || id === 'glass',
  animalSizeOf: (id) => animalSizes[id],
  isWaterKind: (kind) => kind === 'pool',
  livesInWater: (id) => id === 'fish',
};
