// Typed access to char-and-properties.json. Game code reads science content from here,
// never from hard-coded values.

import type { Catalogue, Size } from '../logic/zoo';
import data from './char-and-properties.json';

export interface PlaceableFeature {
  id: string;
  label: string;
  tab: string;
  size: Size;
}

export interface GroundType {
  id: string;
  label: string;
}

export interface PropertyInfo {
  id: string;
  label: string;
  icon: string;
}

export interface Material {
  id: string;
  label: string;
  /** true / false for each property in PROPERTIES; null means "not shown or tested". */
  properties: Readonly<Record<string, boolean | null>>;
}

interface RawFeature {
  label: string;
  tab: string;
  size?: number[];
  paint?: boolean;
  materials?: string[];
}

interface RawMaterial {
  label: string;
  [property: string]: string | boolean | null;
}

const rawFeatures: Record<string, RawFeature> = data.features;
const rawMaterials: Record<string, RawMaterial> = data.materials;

/** Features that are dragged onto the plot: everything with a size that is not painted. */
export const PLACEABLE_FEATURES: readonly PlaceableFeature[] = Object.entries(rawFeatures).flatMap(([id, f]) => {
  const [width, height] = f.size ?? [];
  if (f.paint || width === undefined || height === undefined) return [];
  return [{ id, label: f.label, tab: f.tab, size: [width, height] as const }];
});

const featuresById = new Map(PLACEABLE_FEATURES.map((f) => [f.id, f]));

export function getFeature(id: string): PlaceableFeature | undefined {
  return featuresById.get(id);
}

export function featuresInTab(tab: string): PlaceableFeature[] {
  return PLACEABLE_FEATURES.filter((f) => f.tab === tab);
}

/** The ground types that can be painted (GDD section 9). */
export const GROUND_TYPES: readonly GroundType[] = Object.entries(data.ground).map(([id, g]) => ({
  id,
  label: g.label,
}));

const groundById = new Map(GROUND_TYPES.map((g) => [g.id, g]));

export function getGround(id: string): GroundType | undefined {
  return groundById.get(id);
}

/** The material properties, in the order they are shown: strong, flexible, waterproof, transparent, floats. */
export const PROPERTIES: readonly PropertyInfo[] = Object.entries(data.properties).map(([id, p]) => ({
  id,
  label: p.label,
  icon: p.icon,
}));

export function getMaterial(id: string): Material | undefined {
  const raw = rawMaterials[id];
  if (!raw) return undefined;
  const properties: Record<string, boolean | null> = {};
  for (const property of PROPERTIES) {
    const value = raw[property.id];
    properties[property.id] = typeof value === 'boolean' ? value : null;
  }
  return { id, label: raw.label, properties };
}

/** The materials a fence can be made of. */
export const FENCE_MATERIALS: readonly Material[] = (rawFeatures.fence?.materials ?? []).flatMap((id) => {
  const material = getMaterial(id);
  return material ? [material] : [];
});

const fenceMaterialIds = new Set(FENCE_MATERIALS.map((m) => m.id));

export const featureCatalogue: Catalogue = {
  sizeOf: (kind) => featuresById.get(kind)?.size,
  isGround: (id) => groundById.has(id),
  isFenceMaterial: (id) => fenceMaterialIds.has(id),
};
