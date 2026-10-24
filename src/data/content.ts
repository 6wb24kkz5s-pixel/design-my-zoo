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

interface RawFeature {
  label: string;
  tab: string;
  size?: number[];
  paint?: boolean;
}

const rawFeatures: Record<string, RawFeature> = data.features;

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

export const featureCatalogue: Catalogue = {
  sizeOf: (kind) => featuresById.get(kind)?.size,
};
