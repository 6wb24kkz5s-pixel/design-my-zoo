import { describe, expect, it } from 'vitest';
import { GRID } from '../src/config';
import { ANIMALS, BUBBLES, featureCatalogue } from '../src/data/content';
import { findFreeSpot, needsWater } from '../src/logic/animals';
import { paintSquares } from '../src/logic/paint';
import {
  animalAt,
  canPlace,
  canPlaceAnimal,
  EMPTY_ZOO,
  moveAnimal,
  placeAnimal,
  placeItem,
  removeAnimal,
  type Catalogue,
  type Square,
  type Zoo,
} from '../src/logic/zoo';
import { fakeCatalogue } from './helpers';

function placed(zoo: Zoo, catalogue: Catalogue, animalId: string, col: number, row: number): Zoo {
  const next = placeAnimal(zoo, catalogue, animalId, col, row);
  if (!next) throw new Error(`could not place ${animalId} at ${col},${row}`);
  return next;
}

function withItem(zoo: Zoo, catalogue: Catalogue, kind: string, col: number, row: number): Zoo {
  const next = placeItem(zoo, catalogue, kind, col, row);
  if (!next) throw new Error(`could not place ${kind} at ${col},${row}`);
  return next;
}

const fenceAt = (zoo: Zoo, catalogue: Catalogue, squares: Square[]) =>
  paintSquares(zoo, catalogue, { layer: 'fence', value: 'wood' }, squares);

describe('placing animals', () => {
  it('places an animal, only once', () => {
    const zoo = placed(EMPTY_ZOO, fakeCatalogue, 'bird', 5, 5);
    expect(zoo.animals).toEqual([{ animalId: 'bird', col: 5, row: 5 }]);
    expect(placeAnimal(zoo, fakeCatalogue, 'bird', 9, 9)).toBeNull();
  });

  it('keeps animals off the visitor path and out of unknown ids', () => {
    expect(canPlaceAnimal(EMPTY_ZOO, fakeCatalogue, 'bird', 0, 5)).toBe(false);
    expect(canPlaceAnimal(EMPTY_ZOO, fakeCatalogue, 'bird', GRID.cols - 1, 5)).toBe(false);
    expect(canPlaceAnimal(EMPTY_ZOO, fakeCatalogue, 'dragon', 5, 5)).toBe(false);
    expect(canPlaceAnimal(EMPTY_ZOO, fakeCatalogue, 'bird', 5.5, 5)).toBe(false);
  });

  it('needs all the squares of a bigger animal to be free', () => {
    const zoo = placed(EMPTY_ZOO, fakeCatalogue, 'bird', 6, 6);
    expect(canPlaceAnimal(zoo, fakeCatalogue, 'cow', 5, 5)).toBe(false);
    expect(canPlaceAnimal(zoo, fakeCatalogue, 'cow', 7, 5)).toBe(true);
    expect(canPlaceAnimal(zoo, fakeCatalogue, 'lizard', 5, 6)).toBe(false);
    expect(canPlaceAnimal(zoo, fakeCatalogue, 'lizard', 7, 6)).toBe(true);
  });

  it('does not place on a fence, and fences do not go under an animal', () => {
    const fenced = fenceAt(EMPTY_ZOO, fakeCatalogue, [{ col: 6, row: 6 }]);
    expect(canPlaceAnimal(fenced, fakeCatalogue, 'cow', 5, 5)).toBe(false);
    expect(canPlaceAnimal(fenced, fakeCatalogue, 'cow', 7, 7)).toBe(true);

    const zoo = placed(EMPTY_ZOO, fakeCatalogue, 'cow', 5, 5);
    const squares = [{ col: 4, row: 5 }, { col: 5, row: 5 }, { col: 6, row: 5 }, { col: 7, row: 5 }];
    expect(Object.keys(fenceAt(zoo, fakeCatalogue, squares).fences)).toEqual(['4,5', '7,5']);
  });

  it('lets animals stand on items, and items go under animals', () => {
    const withPool = withItem(EMPTY_ZOO, fakeCatalogue, 'pool', 5, 5);
    const zoo = placed(withPool, fakeCatalogue, 'cow', 6, 6);
    expect(zoo.animals).toHaveLength(1);

    const animalFirst = placed(EMPTY_ZOO, fakeCatalogue, 'cow', 10, 10);
    expect(canPlace(animalFirst, fakeCatalogue, 'big', 9, 9)).toBe(true);
  });
});

describe('moving and removing animals', () => {
  it('moves an animal onto its own old squares, but not onto another animal', () => {
    let zoo = placed(EMPTY_ZOO, fakeCatalogue, 'cow', 5, 5);
    zoo = placed(zoo, fakeCatalogue, 'bird', 12, 12);
    expect(moveAnimal(zoo, fakeCatalogue, 'cow', 6, 6)?.animals[0]).toMatchObject({ col: 6, row: 6 });
    expect(moveAnimal(zoo, fakeCatalogue, 'cow', 11, 11)).toBeNull();
    expect(moveAnimal(zoo, fakeCatalogue, 'cow', 5, 5)).toBeNull();
    expect(moveAnimal(zoo, fakeCatalogue, 'lizard', 3, 3)).toBeNull();
  });

  it('removes an animal so it can be added again', () => {
    const zoo = placed(EMPTY_ZOO, fakeCatalogue, 'bird', 5, 5);
    const without = removeAnimal(zoo, 'bird');
    expect(without?.animals).toEqual([]);
    expect(removeAnimal(zoo, 'cow')).toBeNull();
    expect(without && placeAnimal(without, fakeCatalogue, 'bird', 8, 8)).not.toBeNull();
  });

  it('finds the animal covering a square', () => {
    const zoo = placed(EMPTY_ZOO, fakeCatalogue, 'cow', 5, 5);
    expect(animalAt(zoo, fakeCatalogue, 6, 6)?.animalId).toBe('cow');
    expect(animalAt(zoo, fakeCatalogue, 7, 6)).toBeUndefined();
  });
});

describe('finding a free spot', () => {
  it('picks the free spot closest to where the child is looking', () => {
    expect(findFreeSpot(EMPTY_ZOO, fakeCatalogue, 'bird', { col: 10.5, row: 8.5 })).toEqual({ col: 10, row: 8 });
    expect(findFreeSpot(EMPTY_ZOO, fakeCatalogue, 'cow', { col: 10, row: 8 })).toEqual({ col: 9, row: 7 });
  });

  it('goes around other animals and fences', () => {
    let zoo = placed(EMPTY_ZOO, fakeCatalogue, 'cow', 9, 7);
    zoo = fenceAt(zoo, fakeCatalogue, [{ col: 11, row: 8 }, { col: 11, row: 7 }]);
    const spot = findFreeSpot(zoo, fakeCatalogue, 'bird', { col: 10.5, row: 8.5 });
    expect(spot).not.toBeNull();
    expect(canPlaceAnimal(zoo, fakeCatalogue, 'bird', (spot as Square).col, (spot as Square).row)).toBe(true);
  });

  it('says there is no room when nothing fits', () => {
    const squares: Square[] = [];
    for (let col = 1; col < GRID.cols - 1; col++) {
      for (let row = 1; row < GRID.rows - 1; row++) squares.push({ col, row });
    }
    const full = fenceAt(EMPTY_ZOO, fakeCatalogue, squares);
    expect(findFreeSpot(full, fakeCatalogue, 'bird', { col: 10, row: 10 })).toBeNull();
  });
});

describe('the fish-in-water rule', () => {
  it('needs water on dry land, and not in a pool', () => {
    const dry = placed(EMPTY_ZOO, fakeCatalogue, 'fish', 5, 5);
    expect(needsWater(dry, fakeCatalogue, dry.animals[0]!)).toBe(true);

    const pool = withItem(EMPTY_ZOO, fakeCatalogue, 'pool', 5, 5);
    const wet = placed(pool, fakeCatalogue, 'fish', 6, 6);
    expect(needsWater(wet, fakeCatalogue, wet.animals[0]!)).toBe(false);

    const moved = moveAnimal(wet, fakeCatalogue, 'fish', 9, 6) as Zoo;
    expect(needsWater(moved, fakeCatalogue, moved.animals[0]!)).toBe(true);
  });

  it('does not count a leaking pool as water', () => {
    const leaking = withItem(EMPTY_ZOO, fakeCatalogue, 'pool', 5, 5);
    const leakingWood = placeItem(EMPTY_ZOO, fakeCatalogue, 'pool', 5, 5, 'wood') as Zoo;
    const fishInLeaking = placed(leakingWood, fakeCatalogue, 'fish', 6, 6);
    expect(needsWater(fishInLeaking, fakeCatalogue, fishInLeaking.animals[0]!)).toBe(true);

    const fishInGood = placed(leaking, fakeCatalogue, 'fish', 6, 6);
    expect(needsWater(fishInGood, fakeCatalogue, fishInGood.animals[0]!)).toBe(false);
  });

  it('counts a fish on a water plant floating on a good pool as in water', () => {
    const pool = withItem(EMPTY_ZOO, fakeCatalogue, 'pool', 5, 5);
    const withPlant = withItem(pool, fakeCatalogue, 'plant', 6, 6);
    const zoo = placed(withPlant, fakeCatalogue, 'fish', 6, 6);
    expect(needsWater(zoo, fakeCatalogue, zoo.animals[0]!)).toBe(false);
  });

  it('never applies to animals that do not live in water', () => {
    const zoo = placed(EMPTY_ZOO, fakeCatalogue, 'bird', 5, 5);
    expect(needsWater(zoo, fakeCatalogue, zoo.animals[0]!)).toBe(false);
  });
});

describe('the 12 animals from the data file', () => {
  const byId = (id: string) => ANIMALS.find((a) => a.id === id);

  it('has 12 animals in alphabetical order', () => {
    expect(ANIMALS).toHaveLength(12);
    const labels = ANIMALS.map((a) => a.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  });

  it('reads sizes from the data', () => {
    expect(byId('hippopotamus')?.size).toEqual([2, 2]);
    expect(byId('crocodile')?.size).toEqual([2, 1]);
    expect(byId('goat')?.size).toEqual([1, 1]);
  });

  it('can add all 12 animals, then take each out and put it back', () => {
    const middle = { col: GRID.cols / 2, row: GRID.rows / 2 };
    let zoo = EMPTY_ZOO;
    for (const animal of ANIMALS) {
      const spot = findFreeSpot(zoo, featureCatalogue, animal.id, middle);
      expect(spot, `room for ${animal.id}`).not.toBeNull();
      zoo = placed(zoo, featureCatalogue, animal.id, (spot as Square).col, (spot as Square).row);
    }
    expect(zoo.animals).toHaveLength(12);
    expect(placeAnimal(zoo, featureCatalogue, 'koi', 3, 3)).toBeNull();

    for (const animal of ANIMALS) {
      zoo = removeAnimal(zoo, animal.id) as Zoo;
      const spot = findFreeSpot(zoo, featureCatalogue, animal.id, { col: 3, row: 3 });
      zoo = placed(zoo, featureCatalogue, animal.id, (spot as Square).col, (spot as Square).row);
    }
    expect(zoo.animals).toHaveLength(12);
  });

  it('makes the koi and goldfish need water on dry land, but not in a pool or pond', () => {
    for (const fish of ['koi', 'goldfish']) {
      const dry = placed(EMPTY_ZOO, featureCatalogue, fish, 5, 5);
      expect(needsWater(dry, featureCatalogue, dry.animals[0]!)).toBe(true);
      for (const kind of ['deep_pool', 'shallow_pond']) {
        const pool = withItem(EMPTY_ZOO, featureCatalogue, kind, 5, 5);
        const wet = placed(pool, featureCatalogue, fish, 6, 5);
        expect(needsWater(wet, featureCatalogue, wet.animals[0]!), `${fish} in ${kind}`).toBe(false);
      }
      const bowl = withItem(EMPTY_ZOO, featureCatalogue, 'water_bowl', 5, 5);
      const inBowl = placed(bowl, featureCatalogue, fish, 5, 5);
      expect(needsWater(inBowl, featureCatalogue, inBowl.animals[0]!)).toBe(true);
    }
  });

  it('makes a koi in a fabric pool still need water, because the pool leaks', () => {
    for (const kind of ['deep_pool', 'shallow_pond']) {
      const fabric = placeItem(EMPTY_ZOO, featureCatalogue, kind, 5, 5, 'fabric') as Zoo;
      const koi = placed(fabric, featureCatalogue, 'koi', 6, 5);
      expect(needsWater(koi, featureCatalogue, koi.animals[0]!), kind).toBe(true);
      const glass = placeItem(EMPTY_ZOO, featureCatalogue, kind, 5, 5, 'glass') as Zoo;
      const dry = placed(glass, featureCatalogue, 'koi', 6, 5);
      expect(needsWater(dry, featureCatalogue, dry.animals[0]!), kind).toBe(false);
    }
  });

  it('never makes the other animals need water this way', () => {
    for (const animal of ANIMALS.filter((a) => !a.livesInWater)) {
      const zoo = placed(EMPTY_ZOO, featureCatalogue, animal.id, 5, 5);
      expect(needsWater(zoo, featureCatalogue, zoo.animals[0]!), animal.id).toBe(false);
    }
  });

  it('pairs the water bubble with an icon', () => {
    expect(BUBBLES.needWater.icon.length).toBeGreaterThan(0);
    expect(BUBBLES.needWater.text.length).toBeGreaterThan(0);
  });
});
