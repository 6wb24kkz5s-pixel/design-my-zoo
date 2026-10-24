// Autosave to the iPad (localStorage). Nothing leaves the device.

import { SAVE_KEY } from '../config';
import { EMPTY_ZOO, placeItem, type Catalogue, type Zoo } from './zoo';

const SAVE_VERSION = 1;

/** The parts of localStorage we use, so tests can pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function serializeZoo(zoo: Zoo): string {
  return JSON.stringify({
    version: SAVE_VERSION,
    items: zoo.items.map(({ kind, col, row }) => ({ kind, col, row })),
  });
}

/**
 * Rebuilds a zoo from saved text. Anything unreadable, unknown or no longer
 * fitting is skipped, so a bad save gives an empty (or partial) zoo, never a crash.
 */
export function deserializeZoo(text: string, catalogue: Catalogue): Zoo {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return EMPTY_ZOO;
  }
  if (!isRecord(parsed) || parsed.version !== SAVE_VERSION || !Array.isArray(parsed.items)) {
    return EMPTY_ZOO;
  }

  let zoo = EMPTY_ZOO;
  for (const raw of parsed.items) {
    if (!isRecord(raw)) continue;
    const { kind, col, row } = raw;
    if (typeof kind === 'string' && typeof col === 'number' && typeof row === 'number') {
      zoo = placeItem(zoo, catalogue, kind, col, row) ?? zoo;
    }
  }
  return zoo;
}

export function loadZoo(store: KeyValueStore | null, catalogue: Catalogue): Zoo {
  try {
    const text = store?.getItem(SAVE_KEY);
    return text ? deserializeZoo(text, catalogue) : EMPTY_ZOO;
  } catch {
    return EMPTY_ZOO;
  }
}

export function saveZoo(store: KeyValueStore | null, zoo: Zoo): void {
  try {
    store?.setItem(SAVE_KEY, serializeZoo(zoo));
  } catch {
    // Storage full or blocked (e.g. private browsing): keep playing without saving.
  }
}

/** localStorage, or null if Safari blocks it. */
export function browserStorage(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
