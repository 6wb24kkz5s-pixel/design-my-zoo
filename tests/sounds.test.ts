import { describe, expect, it } from 'vitest';
import { loadSoundSetting, saveSoundSetting, soundForChange, SOUND_KEY } from '../src/audio/sounds';
import { featureCatalogue as catalogue } from '../src/data/content';
import { removeItem, EMPTY_ZOO, placeAnimal, placeItem, type Zoo } from '../src/logic/zoo';
import type { KeyValueStore } from '../src/logic/save';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe('sound setting', () => {
  it('is off when nothing was saved, and with no storage', () => {
    expect(loadSoundSetting(memoryStore())).toBe(false);
    expect(loadSoundSetting(null)).toBe(false);
  });

  it('remembers on and off', () => {
    const store = memoryStore();
    saveSoundSetting(store, true);
    expect(store.data.get(SOUND_KEY)).toBe('on');
    expect(loadSoundSetting(store)).toBe(true);
    saveSoundSetting(store, false);
    expect(loadSoundSetting(store)).toBe(false);
  });

  it('survives storage that throws', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadSoundSetting(broken)).toBe(false);
    expect(() => saveSoundSetting(broken, true)).not.toThrow();
  });
});

describe('soundForChange', () => {
  const pool = placeItem(EMPTY_ZOO, catalogue, 'deep_pool', 6, 6, 'glass') as Zoo;

  it('is silent when nothing changed', () => {
    expect(soundForChange(pool, pool, catalogue)).toBeNull();
  });

  it('pops when something dry is put down', () => {
    const next = placeItem(EMPTY_ZOO, catalogue, 'bushes', 5, 5) as Zoo;
    expect(soundForChange(EMPTY_ZOO, next, catalogue)).toBe('pop');
  });

  it('pops when an animal is placed', () => {
    const next = placeAnimal(EMPTY_ZOO, catalogue, 'parrot', 5, 5) as Zoo;
    expect(soundForChange(EMPTY_ZOO, next, catalogue)).toBe('pop');
  });

  it('splashes for water things', () => {
    const plants = placeItem(pool, catalogue, 'water_plants', 7, 7) as Zoo;
    expect(soundForChange(pool, plants, catalogue)).toBe('splash');
    expect(soundForChange(EMPTY_ZOO, pool, catalogue)).toBe('splash');
  });

  it('bloops when things are taken away', () => {
    const removed = removeItem(pool, catalogue, pool.items[0]!.id) as Zoo;
    expect(soundForChange(pool, removed, catalogue)).toBe('bloop');
    expect(soundForChange(pool, EMPTY_ZOO, catalogue)).toBe('bloop');
  });
});
