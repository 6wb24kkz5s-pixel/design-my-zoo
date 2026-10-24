import type { Catalogue, Size } from '../src/logic/zoo';

// Made-up kinds, ground and materials so rules tests do not depend on the science data.
const sizes: Record<string, Size> = { small: [1, 1], big: [3, 3], wide: [2, 1] };

export const fakeCatalogue: Catalogue = {
  sizeOf: (kind) => sizes[kind],
  isGround: (id) => id === 'grass' || id === 'soil',
  isFenceMaterial: (id) => id === 'wood' || id === 'glass',
};
