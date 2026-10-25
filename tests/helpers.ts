import { MATERIAL_OK, missingProperty } from '../src/logic/materials';
import type { Catalogue, Size } from '../src/logic/zoo';

// Made-up kinds, ground, materials and animals so rules tests do not depend on the science data.
const sizes: Record<string, Size> = {
  small: [1, 1],
  big: [3, 3],
  wide: [2, 1],
  pool: [3, 3],
  plant: [1, 1],
  hut: [2, 2],
};
const animalSizes: Record<string, Size> = { fish: [1, 1], cow: [2, 2], lizard: [2, 1], bird: [1, 1] };

/** What each made-up material is, for the made-up jobs below. */
const materials: Record<string, Record<string, boolean>> = {
  glass: { waterproof: true, strong: true, letsAirThrough: false },
  wood: { waterproof: false, strong: true, letsAirThrough: false },
  net: { waterproof: false, strong: false, letsAirThrough: true },
};

/** The made-up jobs: which materials are allowed, and what they must be. */
const jobs: Record<string, { materials: string[]; mustBe: Record<string, boolean> }> = {
  pool: { materials: ['glass', 'wood'], mustBe: { waterproof: true } },
  hut: { materials: ['wood', 'net'], mustBe: { strong: true } },
  roof: { materials: ['glass', 'net'], mustBe: { letsAirThrough: true } },
};

export const fakeCatalogue: Catalogue = {
  sizeOf: (kind) => sizes[kind],
  isGround: (id) => id === 'grass' || id === 'soil',
  isFenceMaterial: (id) => id === 'wood' || id === 'glass',
  animalSizeOf: (id) => animalSizes[id],
  isWaterKind: (kind) => kind === 'pool',
  livesInWater: (id) => id === 'fish',
  placeOn: (kind) => (kind === 'plant' ? 'water' : null),
  materialsFor: (kind) => (kind === 'pool' || kind === 'hut' ? (jobs[kind]?.materials ?? []) : []),
  materialCheck: (job, materialId) => {
    const rule = jobs[job];
    const material = materials[materialId];
    if (!rule || !material) return MATERIAL_OK;
    const missing = missingProperty(rule.mustBe, (property) => material[property]);
    return { works: missing === null, missing };
  },
  isRoofMaterial: (id) => jobs.roof?.materials.includes(id) ?? false,
};
