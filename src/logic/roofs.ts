// Roofs: one material per enclosure, stored per square like ground and fences.

import { checkArea, regionOf } from './enclosures';
import { squareKey, type Catalogue, type Square, type Zoo } from './zoo';

/** What one tap does in roof mode: roof an area with this material, or (null) take its roof off. */
export interface RoofTool {
  material: string | null;
}

export type RoofResult =
  | { ok: true; zoo: Zoo }
  /** needsFence: the area is not closed in. nothing: the square is a fence, the path, or the material is unknown. */
  | { ok: false; reason: 'needsFence' | 'nothing' };

/** Puts a roof of this material over the whole enclosure around `square`. Open areas cannot be roofed. */
export function roofArea(zoo: Zoo, catalogue: Catalogue, square: Square, material: string): RoofResult {
  if (!catalogue.isRoofMaterial(material)) return { ok: false, reason: 'nothing' };
  const check = checkArea(zoo.fences, square);
  if (check.kind === 'none') return { ok: false, reason: 'nothing' };
  if (check.kind !== 'closed') return { ok: false, reason: 'needsFence' };

  const roofs: Record<string, string> = { ...zoo.roofs };
  let changed = false;
  for (const { col, row } of check.squares) {
    const key = squareKey(col, row);
    if (roofs[key] !== material) {
      roofs[key] = material;
      changed = true;
    }
  }
  return { ok: true, zoo: changed ? { ...zoo, roofs } : zoo };
}

/** Takes the roof off the area around `square`. Returns the same zoo if there was no roof there. */
export function removeRoofArea(zoo: Zoo, square: Square): Zoo {
  const roofs: Record<string, string> = { ...zoo.roofs };
  let changed = false;
  for (const { col, row } of regionOf(zoo.fences, square)) {
    const key = squareKey(col, row);
    if (key in roofs) {
      delete roofs[key];
      changed = true;
    }
  }
  return changed ? { ...zoo, roofs } : zoo;
}
