import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '../src/config';
import { deserializeZoo, loadZoo, saveZoo, serializeZoo, type KeyValueStore } from '../src/logic/save';
import { EMPTY_ZOO, placeItem, type Catalogue, type Zoo } from '../src/logic/zoo';

const catalogue: Catalogue = {
  sizeOf: (kind) => ({ small: [1, 1], big: [3, 3] } as const)[kind as 'small' | 'big'],
};

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

function sampleZoo(): Zoo {
  const a = placeItem(EMPTY_ZOO, catalogue, 'big', 4, 4);
  const b = a && placeItem(a, catalogue, 'small', 10, 2);
  if (!b) throw new Error('could not build sample zoo');
  return b;
}

describe('saving and loading', () => {
  it('loads back exactly what was saved', () => {
    const store = memoryStore();
    const zoo = sampleZoo();
    saveZoo(store, zoo);
    expect(store.data.has(SAVE_KEY)).toBe(true);
    const loaded = loadZoo(store, catalogue);
    expect(loaded.items.map(({ kind, col, row }) => ({ kind, col, row }))).toEqual(
      zoo.items.map(({ kind, col, row }) => ({ kind, col, row })),
    );
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
      version: 1,
      items: [
        { kind: 'small', col: 3, row: 3 },
        { kind: 'dragon', col: 5, row: 5 },
        { kind: 'small', col: 3, row: 3 },
        { kind: 'small', col: 0, row: 0 },
        { kind: 'big', col: 'x', row: 2 },
        'junk',
      ],
    });
    expect(deserializeZoo(mixed, catalogue).items).toEqual([{ id: 1, kind: 'small', col: 3, row: 3 }]);
  });

  it('round-trips through the text format', () => {
    const zoo = sampleZoo();
    expect(deserializeZoo(serializeZoo(zoo), catalogue)).toEqual(zoo);
  });
});
