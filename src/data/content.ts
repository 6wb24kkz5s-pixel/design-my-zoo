// Typed access to char-and-properties.json. Game code reads science content from here,
// never from hard-coded values.

import { MATERIAL_OK, missingProperty, type MaterialCheck } from '../logic/materials';
import type { HintRule, NeedsData } from '../logic/needs';
import type { Catalogue, Size } from '../logic/zoo';
import data from './char-and-properties.json';

export interface PlaceableFeature {
  id: string;
  label: string;
  tab: string;
  size: Size;
  /** The materials it can be made of. Empty if there is no material choice. */
  materialIds: readonly string[];
  /** What the material must be for the job, e.g. { waterproof: true }. */
  mustBe: Readonly<Record<string, boolean>>;
  failMessage: string | null;
  /** "water" means it can only go on pool or pond squares. */
  placeOn: 'water' | null;
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

/** A short message for the child, always shown with its icon. */
export interface Message {
  icon: string;
  text: string;
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
  isWater?: boolean;
  mustBe?: Record<string, boolean>;
  failMessage?: string;
  placeOn?: string;
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
  return [
    {
      id,
      label: f.label,
      tab: f.tab,
      size: [width, height] as const,
      materialIds: f.materials ?? [],
      mustBe: f.mustBe ?? {},
      failMessage: f.failMessage ?? null,
      placeOn: f.placeOn === 'water' ? ('water' as const) : null,
    },
  ];
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

/** The materials a roof can be made of. */
export const ROOF_MATERIALS: readonly Material[] = data.roof.materials.flatMap((id) => {
  const material = getMaterial(id);
  return material ? [material] : [];
});

const roofMaterialIds = new Set(ROOF_MATERIALS.map((m) => m.id));

/** The materials with these ids, in the same order. Unknown ids are skipped. */
export function getMaterials(ids: readonly string[]): Material[] {
  return ids.flatMap((id) => {
    const material = getMaterial(id);
    return material ? [material] : [];
  });
}

/** What each job needs from its material. The job is a feature id, "fence" or "roof". */
interface JobRule {
  materialIds: readonly string[];
  mustBe: Readonly<Record<string, boolean>>;
  failMessage: string | null;
}

function buildJobRules(): Map<string, JobRule> {
  const rules = new Map<string, JobRule>();
  for (const [id, f] of Object.entries(rawFeatures)) {
    if (f.mustBe) rules.set(id, { materialIds: f.materials ?? [], mustBe: f.mustBe, failMessage: f.failMessage ?? null });
  }
  rules.set('roof', { materialIds: data.roof.materials, mustBe: data.roof.mustBe, failMessage: data.roof.failMessage });
  return rules;
}

const jobRules = buildJobRules();

/** Does this material suit this job (a feature id, "fence" or "roof")? Jobs without needs always work. */
export function checkMaterial(job: string, materialId: string): MaterialCheck {
  const rule = jobRules.get(job);
  const raw = rawMaterials[materialId];
  if (!rule || !raw) return MATERIAL_OK;
  const missing = missingProperty(rule.mustBe, (property) => {
    const value = raw[property];
    return typeof value === 'boolean' ? value : null;
  });
  return { works: missing === null, missing };
}

/** The gentle message for when a material does not suit its job, from the data file. */
export function failMessageFor(job: string): Message | null {
  const text = jobRules.get(job)?.failMessage;
  // These messages already include their own icon, so the banner needs none of its own.
  return text ? { icon: '', text } : null;
}

/** Messages for the enclosure check: closed in, a gap, or not closed in at all. */
export const ENCLOSURE_MESSAGES: Readonly<Record<'closed' | 'gap' | 'open', Message>> = data.enclosureMessages;

/** Speech-bubble messages that animals say. */
export const BUBBLES: Readonly<Record<'needWater', Message>> = data.bubbles;

/** Short notices shown in the message banner, e.g. when a new animal has nowhere to go. */
export const NOTICES: Readonly<Record<'noRoom' | 'needsWater' | 'roofNeedsFence', Message>> = data.notices;

/** An animal exactly as it is written in the data file. */
interface RawAnimal {
  id: string;
  label: string;
  size: number[];
  livesInWater: boolean;
  flies: boolean;
  small: boolean;
  food: string[];
  water: string[];
  home: string[][];
  eats: string[];
  messages: Record<string, string>;
}

const rawAnimals = data.animals as unknown as RawAnimal[];

/** What the needs engine reads from the data file. */
export const NEEDS_DATA: NeedsData = {
  animals: rawAnimals.map((a) => ({
    id: a.id,
    label: a.label,
    food: a.food,
    water: a.water,
    home: a.home,
    eats: a.eats,
    flies: a.flies,
    small: a.small,
    livesInWater: a.livesInWater,
  })),
  gapsOf: (id) => {
    const gaps = rawMaterials[id]?.gaps;
    return gaps === 'small' || gaps === 'big' ? gaps : 'none';
  },
  isTransparent: (id) => rawMaterials[id]?.transparent === true,
};

/** An animal's own messages from the data file (food, home, air, water, safety, eats), if it has them. */
export function getAnimalMessages(animalId: string): Readonly<Record<string, string>> {
  return rawAnimals.find((a) => a.id === animalId)?.messages ?? {};
}

/** Generic messages for an empty heart, with {animal} and {other} to fill in. */
export const HEART_MESSAGES: Readonly<Record<'food' | 'water' | 'air' | 'home' | 'safety' | 'eats' | 'eaten', string>> =
  data.heartMessages;

export const VISITOR_MESSAGES: Readonly<Record<'great' | 'okay' | 'none', Message>> = data.visitorMessages;

export const HAPPY_MESSAGE: Message = data.happyMessage;

/** The wording for each line of the 💡 checklist that is a rule rather than an item. */
export const HINT_LABELS: Readonly<Record<HintRule, Message>> = data.hintLabels;

/** Fills in {animal} and {other} in a message from the data file. */
export function fillMessage(text: string, values: { animal?: string; other?: string }): string {
  return text.replace('{animal}', values.animal ?? '').replace('{other}', values.other ?? '');
}

export interface Animal {
  id: string;
  label: string;
  size: Size;
  livesInWater: boolean;
}

/** The 12 animals, in alphabetical order, so the order gives no hint about how they are grouped. */
export const ANIMALS: readonly Animal[] = data.animals
  .map((a) => ({
    id: a.id,
    label: a.label,
    size: [a.size[0] ?? 1, a.size[1] ?? 1] as const,
    livesInWater: a.livesInWater,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

const animalsById = new Map(ANIMALS.map((a) => [a.id, a]));

export function getAnimal(id: string): Animal | undefined {
  return animalsById.get(id);
}

const waterKinds = new Set(
  Object.entries(rawFeatures)
    .filter(([, f]) => f.isWater === true)
    .map(([id]) => id),
);

export const featureCatalogue: Catalogue = {
  sizeOf: (kind) => featuresById.get(kind)?.size,
  isGround: (id) => groundById.has(id),
  isFenceMaterial: (id) => fenceMaterialIds.has(id),
  animalSizeOf: (id) => animalsById.get(id)?.size,
  isWaterKind: (kind) => waterKinds.has(kind),
  livesInWater: (id) => animalsById.get(id)?.livesInWater === true,
  placeOn: (kind) => featuresById.get(kind)?.placeOn ?? null,
  materialsFor: (kind) => featuresById.get(kind)?.materialIds ?? [],
  materialCheck: checkMaterial,
  isRoofMaterial: (id) => roofMaterialIds.has(id),
};
