import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '../src/config';
import { paintSquares } from '../src/logic/paint';
import { deserializeZoo, loadZoo, saveZoo, serializeZoo, type KeyValueStore } from '../src/logic/save';
import { EMPTY_ZOO, placeAnimal, placeItem, type Zoo } from '../src/logic/zoo';
import { fakeCatalogue as catalogue } from './helpers';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

function sampleZoo(): Zoo {
  const a = placeItem(EMPTY_ZOO, catalogue, 'big', 4, 4);
  const b = a && placeItem(a, catalogue, 'small', 10, 2);
  if (!b) throw new Error('could not build sample zoo');
  const grassed = paintSquares(b, catalogue, { layer: 'ground', value: 'grass' }, [
    { col: 4, row: 4 },
    { col: 12, row: 12 },
  ]);
  const fenced = paintSquares(grassed, catalogue, { layer: 'fence', value: 'wood' }, [
    { col: 3, row: 3 },
    { col: 3, row: 4 },
  ]);
  const withCow = placeAnimal(fenced, catalogue, 'cow', 15, 10);
  const withFish = withCow && placeAnimal(withCow, catalogue, 'fish', 5, 5);
  if (!withFish) throw new Error('could not add animals to sample zoo');
  return withFish;
}

describe('saving and loading', () => {
  it('loads back exactly what was saved, including ground and fences', () => {
    const store = memoryStore();
    const zoo = sampleZoo();
    saveZoo(store, zoo);
    expect(store.data.has(SAVE_KEY)).toBe(true);
    const loaded = loadZoo(store, catalogue);
    expect(loaded.items.map(({ kind, col, row }) => ({ kind, col, row }))).toEqual(
      zoo.items.map(({ kind, col, row }) => ({ kind, col, row })),
    );
    expect(loaded.ground).toEqual(zoo.ground);
    expect(loaded.fences).toEqual(zoo.fences);
    expect(loaded.animals).toEqual(zoo.animals);
  });

  it('still loads a zoo saved by the M2 version (items only)', () => {
    const m2Save = JSON.stringify({ version: 1, items: [{ kind: 'big', col: 4, row: 4 }] });
    const loaded = deserializeZoo(m2Save, catalogue);
    expect(loaded.items).toEqual([{ id: 1, kind: 'big', col: 4, row: 4 }]);
    expect(loaded.ground).toEqual({});
    expect(loaded.fences).toEqual({});
    expect(loaded.animals).toEqual([]);
  });

  it('still loads a zoo saved by the M3 and M4 version (no animals)', () => {
    const m3Save = JSON.stringify({
      version: 2,
      items: [{ kind: 'small', col: 4, row: 4 }],
      ground: { '6,6': 'grass' },
      fences: { '9,9': 'wood' },
    });
    const loaded = deserializeZoo(m3Save, catalogue);
    expect(loaded.items).toHaveLength(1);
    expect(loaded.ground).toEqual({ '6,6': 'grass' });
    expect(loaded.fences).toEqual({ '9,9': 'wood' });
    expect(loaded.animals).toEqual([]);
  });

  it('saves and loads item materials and roofs', () => {
    const pool = placeItem(EMPTY_ZOO, catalogue, 'pool', 5, 5, 'wood') as Zoo;
    const hut = placeItem(pool, catalogue, 'hut', 12, 12, 'net') as Zoo;
    const zoo: Zoo = { ...hut, roofs: { '12,12': 'net', '13,12': 'glass' } };
    const loaded = deserializeZoo(serializeZoo(zoo), catalogue);
    expect(loaded.items.map((i) => i.material)).toEqual(['wood', 'net']);
    expect(loaded.roofs).toEqual({ '12,12': 'net', '13,12': 'glass' });
  });

  it('gives items from an older save (no material) a working one', () => {
    const m5Save = JSON.stringify({
      version: 3,
      items: [{ kind: 'pool', col: 5, row: 5 }, { kind: 'hut', col: 12, row: 12 }, { kind: 'small', col: 3, row: 3 }],
    });
    const loaded = deserializeZoo(m5Save, catalogue);
    expect(loaded.items.map((i) => i.material)).toEqual(['glass', 'wood', undefined]);
    expect(loaded.roofs).toEqual({});
  });

  it('loads pools before the water-only items on them, whatever order they were saved in', () => {
    const save = JSON.stringify({
      version: 4,
      items: [{ kind: 'plant', col: 6, row: 6 }, { kind: 'pool', col: 5, row: 5, material: 'glass' }],
    });
    const loaded = deserializeZoo(save, catalogue);
    expect(loaded.items.map((i) => i.kind).sort()).toEqual(['plant', 'pool']);
  });

  it('skips bad roofs and replaces a material the item is not offered in', () => {
    const save = JSON.stringify({
      version: 4,
      items: [{ kind: 'pool', col: 5, row: 5, material: 'cheese' }],
      roofs: { '6,6': 'net', '7,7': 'wood', '0,0': 'net', nonsense: 'net', '8,8': 4 },
    });
    const loaded = deserializeZoo(save, catalogue);
    expect(loaded.items[0]?.material).toBe('glass');
    expect(loaded.roofs).toEqual({ '6,6': 'net' });
  });

  it('skips animals that are unknown, repeated, on a fence or off the grid', () => {
    const save = JSON.stringify({
      version: 3,
      items: [],
      fences: { '9,9': 'wood' },
      animals: [
        { animalId: 'bird', col: 3, row: 3 },
        { animalId: 'bird', col: 5, row: 5 },
        { animalId: 'dragon', col: 6, row: 6 },
        { animalId: 'fish', col: 9, row: 9 },
        { animalId: 'cow', col: 0, row: 0 },
        { animalId: 'lizard', col: 'x', row: 2 },
        'junk',
      ],
    });
    expect(deserializeZoo(save, catalogue).animals).toEqual([{ animalId: 'bird', col: 3, row: 3 }]);
  });

  it('gives an empty zoo when nothing is saved or storage is blocked', () => {
    expect(loadZoo(memoryStore(), catalogue)).toBe(EMPTY_ZOO);
    expect(loadZoo(null, catalogue)).toBe(EMPTY_ZOO);
    const throwing: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadZoo(throwing, catalogue)).toBe(EMPTY_ZOO);
    expect(() => saveZoo(throwing, sampleZoo())).not.toThrow();
  });

  it('ignores broken or unknown data without crashing', () => {
    expect(deserializeZoo('not json', catalogue)).toBe(EMPTY_ZOO);
    expect(deserializeZoo('{"version": 99, "items": []}', catalogue)).toBe(EMPTY_ZOO);
    expect(deserializeZoo('null', catalogue)).toBe(EMPTY_ZOO);

    const mixed = JSON.stringify({
      version: 2,
      items: [
        { kind: 'small', col: 3, row: 3 },
        { kind: 'dragon', col: 5, row: 5 },
        { kind: 'small', col: 3, row: 3 },
        { kind: 'small', col: 0, row: 0 },
        { kind: 'big', col: 'x', row: 2 },
        'junk',
      ],
      ground: { '6,6': 'grass', '7,7': 'lava', '0,0': 'grass', nonsense: 'soil', '8,8': 5 },
      fences: { '9,9': 'wood', '10,10': 'cheese' },
    });
    const zoo = deserializeZoo(mixed, catalogue);
    expect(zoo.items).toEqual([{ id: 1, kind: 'small', col: 3, row: 3 }]);
    expect(zoo.ground).toEqual({ '6,6': 'grass' });
    expect(zoo.fences).toEqual({ '9,9': 'wood' });
  });

  it('round-trips through the text format', () => {
    const zoo = sampleZoo();
    expect(deserializeZoo(serializeZoo(zoo), catalogue)).toEqual(zoo);
  });
});
