import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '../src/config';
import { paintSquares } from '../src/logic/paint';
import { deserializeZoo, loadZoo, saveZoo, serializeZoo, type KeyValueStore } from '../src/logic/save';
import { EMPTY_ZOO, placeItem, type Zoo } from '../src/logic/zoo';
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
  return paintSquares(grassed, catalogue, { layer: 'fence', value: 'wood' }, [
    { col: 3, row: 3 },
    { col: 3, row: 4 },
  ]);
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
  });

  it('still loads a zoo saved by the M2 version (items only)', () => {
    const m2Save = JSON.stringify({ version: 1, items: [{ kind: 'big', col: 4, row: 4 }] });
    const loaded = deserializeZoo(m2Save, catalogue);
    expect(loaded.items).toEqual([{ id: 1, kind: 'big', col: 4, row: 4 }]);
    expect(loaded.ground).toEqual({});
    expect(loaded.fences).toEqual({});
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
