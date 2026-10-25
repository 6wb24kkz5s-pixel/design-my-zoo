import { describe, expect, it } from 'vitest';
import {
  checkMaterial,
  failMessageFor,
  featureCatalogue,
  FENCE_MATERIALS,
  PLACEABLE_FEATURES,
  ROOF_MATERIALS,
} from '../src/data/content';
import { missingProperty } from '../src/logic/materials';
import { defaultMaterial, EMPTY_ZOO, placeItem, setItemMaterial, type Zoo } from '../src/logic/zoo';

const sorted = (ids: string[]) => [...ids].sort();

/** Every job with a material choice, and the materials that do NOT suit it (from the science content). */
const EXPECTED_FAILURES: Record<string, string[]> = {
  deep_pool: ['fabric'],
  shallow_pond: ['fabric'],
  water_bowl: ['fabric'],
  floating_island: ['concrete', 'metal'],
  hut: ['fabric'],
  shade_cover: ['glass'],
  swing: ['metal', 'wood'],
  fence: ['clear_plastic', 'fabric'],
  roof: ['clear_plastic', 'glass'],
};

/** The property each unsuitable material is missing. */
const EXPECTED_MISSING: Record<string, string> = {
  deep_pool: 'waterproof',
  shallow_pond: 'waterproof',
  water_bowl: 'waterproof',
  floating_island: 'floats',
  hut: 'strong',
  shade_cover: 'transparent',
  swing: 'flexible',
  fence: 'strong',
  roof: 'letsAirThrough',
};

function materialIdsFor(job: string): readonly string[] {
  if (job === 'roof') return ROOF_MATERIALS.map((m) => m.id);
  if (job === 'fence') return FENCE_MATERIALS.map((m) => m.id);
  return featureCatalogue.materialsFor(job);
}

describe('does the material suit the job?', () => {
  it('finds exactly the unsuitable materials for every job', () => {
    for (const [job, expected] of Object.entries(EXPECTED_FAILURES)) {
      const failing = materialIdsFor(job).filter((id) => !checkMaterial(job, id).works);
      expect(sorted(failing), job).toEqual(sorted(expected));
    }
  });

  it('says which property is missing', () => {
    for (const [job, property] of Object.entries(EXPECTED_MISSING)) {
      for (const id of EXPECTED_FAILURES[job] ?? []) {
        expect(checkMaterial(job, id).missing, `${job} with ${id}`).toBe(property);
      }
    }
  });

  it('has a gentle message for every job that can fail', () => {
    for (const job of Object.keys(EXPECTED_FAILURES)) {
      const message = failMessageFor(job);
      expect(message?.text.length, job).toBeGreaterThan(0);
    }
  });

  it('does not test properties that are null in the data', () => {
    expect(missingProperty({ waterproof: true }, () => null)).toBeNull();
    expect(missingProperty({ strong: true }, () => undefined)).toBeNull();
    expect(missingProperty({ strong: true, floats: true }, (p) => (p === 'strong' ? true : false))).toBe('floats');
  });

  it('lets jobs without needs and unknown materials through', () => {
    expect(checkMaterial('rock_cave', 'glass').works).toBe(true);
    expect(checkMaterial('hut', 'cheese').works).toBe(true);
  });
});

describe('placing every feature with every allowed material', () => {
  it('can place each feature with each of its materials, and only those', () => {
    const withMaterials = PLACEABLE_FEATURES.filter((f) => f.materialIds.length > 0);
    expect(withMaterials.map((f) => f.id).sort()).toEqual(
      ['deep_pool', 'floating_island', 'hut', 'shade_cover', 'shallow_pond', 'swing', 'water_bowl'],
    );

    for (const feature of withMaterials) {
      for (const material of feature.materialIds) {
        // Water-only items need a pool underneath them.
        const base: Zoo = feature.placeOn === 'water' ? (placeItem(EMPTY_ZOO, featureCatalogue, 'deep_pool', 5, 5) as Zoo) : EMPTY_ZOO;
        const col = feature.placeOn === 'water' ? 6 : 10;
        const row = feature.placeOn === 'water' ? 6 : 10;
        const placed = placeItem(base, featureCatalogue, feature.id, col, row, material);
        expect(placed, `${feature.id} in ${material}`).not.toBeNull();
        expect(placed?.items.at(-1)?.material).toBe(material);
      }
    }
  });

  it('refuses a material the feature is not offered in', () => {
    expect(placeItem(EMPTY_ZOO, featureCatalogue, 'hut', 10, 10, 'glass')).toBeNull();
    expect(placeItem(EMPTY_ZOO, featureCatalogue, 'water_bowl', 10, 10, 'wood')).toBeNull();
  });

  it('gives a working material by default', () => {
    for (const feature of PLACEABLE_FEATURES.filter((f) => f.materialIds.length > 0)) {
      const material = defaultMaterial(featureCatalogue, feature.id);
      expect(material, feature.id).toBeDefined();
      expect(checkMaterial(feature.id, material as string).works, feature.id).toBe(true);
    }
  });

  it('gives items with no material choice no material', () => {
    const zoo = placeItem(EMPTY_ZOO, featureCatalogue, 'tall_tree', 10, 10) as Zoo;
    expect(zoo.items[0]?.material).toBeUndefined();
    expect(setItemMaterial(zoo, featureCatalogue, 1, 'wood')).toBeNull();
  });

  it('changes the material of a placed item, to allowed materials only', () => {
    const zoo = placeItem(EMPTY_ZOO, featureCatalogue, 'hut', 10, 10, 'wood') as Zoo;
    expect(setItemMaterial(zoo, featureCatalogue, 1, 'fabric')?.items[0]?.material).toBe('fabric');
    expect(setItemMaterial(zoo, featureCatalogue, 1, 'glass')).toBeNull();
    expect(setItemMaterial(zoo, featureCatalogue, 1, 'wood')).toBeNull();
    expect(setItemMaterial(zoo, featureCatalogue, 99, 'fabric')).toBeNull();
  });
});

describe('water-only items from the data file', () => {
  const waterOnly = ['water_plants', 'floating_island', 'fish_food', 'shrimp'];

  it('are exactly the ones the data marks placeOn water', () => {
    expect(sorted(PLACEABLE_FEATURES.filter((f) => f.placeOn === 'water').map((f) => f.id))).toEqual(sorted(waterOnly));
  });

  it('only go on pool and pond squares', () => {
    for (const kind of waterOnly) {
      expect(placeItem(EMPTY_ZOO, featureCatalogue, kind, 8, 8), `${kind} on dry land`).toBeNull();
      for (const pool of ['deep_pool', 'shallow_pond']) {
        const withPool = placeItem(EMPTY_ZOO, featureCatalogue, pool, 5, 5) as Zoo;
        expect(placeItem(withPool, featureCatalogue, kind, 6, 5), `${kind} on a ${pool}`).not.toBeNull();
      }
    }
  });

  it('do not go on a water bowl', () => {
    const bowl = placeItem(EMPTY_ZOO, featureCatalogue, 'water_bowl', 5, 5) as Zoo;
    expect(placeItem(bowl, featureCatalogue, 'water_plants', 5, 5)).toBeNull();
  });
});
