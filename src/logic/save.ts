// Autosave to the iPad (localStorage). Nothing leaves the device.

import { SAVE_KEY } from '../config';
import { paintSquares } from './paint';
import { EMPTY_ZOO, insideBuildingArea, parseSquareKey, placeAnimal, placeItem, type Catalogue, type Zoo } from './zoo';

/**
 * Version 1 (M2) had items only; version 2 (M3) added ground and fences; version 3 (M5)
 * added animals; version 4 (M6) adds item materials and roofs.
 */
const SAVE_VERSION = 4;

/** The parts of localStorage we use, so tests can pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function serializeZoo(zoo: Zoo): string {
  return JSON.stringify({
    version: SAVE_VERSION,
    items: zoo.items.map(({ kind, col, row, material }) => ({ kind, col, row, material })),
    ground: zoo.ground,
    fences: zoo.fences,
    roofs: zoo.roofs,
    animals: zoo.animals.map(({ animalId, col, row }) => ({ animalId, col, row })),
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
  const version = isRecord(parsed) ? parsed.version : undefined;
  const supported = version === 1 || version === 2 || version === 3 || version === 4;
  if (!isRecord(parsed) || !supported || !Array.isArray(parsed.items)) {
    return EMPTY_ZOO;
  }

  let zoo = EMPTY_ZOO;
  zoo = loadLayer(zoo, catalogue, 'ground', parsed.ground);
  zoo = loadLayer(zoo, catalogue, 'fence', parsed.fences);

  const saved = parsed.items.flatMap((raw) => {
    if (!isRecord(raw)) return [];
    const { kind, col, row, material } = raw;
    if (typeof kind !== 'string' || typeof col !== 'number' || typeof row !== 'number') return [];
    return [{ kind, col, row, material: typeof material === 'string' ? material : undefined }];
  });
  // Pools first, so the water-only items that float on them have somewhere to go.
  const floating = (kind: string) => catalogue.placeOn(kind) !== null;
  for (const { kind, col, row, material } of [...saved.filter((s) => !floating(s.kind)), ...saved.filter((s) => floating(s.kind))]) {
    // An older save has no material: the item gets a sensible default instead.
    zoo = placeItem(zoo, catalogue, kind, col, row, material) ?? placeItem(zoo, catalogue, kind, col, row) ?? zoo;
  }
  zoo = loadRoofs(zoo, catalogue, parsed.roofs);
  if (Array.isArray(parsed.animals)) {
    for (const raw of parsed.animals) {
      if (!isRecord(raw)) continue;
      const { animalId, col, row } = raw;
      if (typeof animalId === 'string' && typeof col === 'number' && typeof row === 'number') {
        zoo = placeAnimal(zoo, catalogue, animalId, col, row) ?? zoo;
      }
    }
  }
  return zoo;
}

/** Puts saved roofs back, keeping only known roof materials on squares in the building area. */
function loadRoofs(zoo: Zoo, catalogue: Catalogue, raw: unknown): Zoo {
  if (!isRecord(raw)) return zoo;
  const roofs: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const square = parseSquareKey(key);
    if (!square || typeof value !== 'string' || !catalogue.isRoofMaterial(value)) continue;
    if (!insideBuildingArea({ ...square, width: 1, height: 1 })) continue;
    roofs[key] = value;
  }
  return Object.keys(roofs).length > 0 ? { ...zoo, roofs } : zoo;
}

/** Paints saved squares back through the normal paint rules, so bad entries are dropped. */
function loadLayer(zoo: Zoo, catalogue: Catalogue, layer: 'ground' | 'fence', raw: unknown): Zoo {
  if (!isRecord(raw)) return zoo;
  for (const [key, value] of Object.entries(raw)) {
    const square = parseSquareKey(key);
    if (square && typeof value === 'string') {
      zoo = paintSquares(zoo, catalogue, { layer, value }, [square]);
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
