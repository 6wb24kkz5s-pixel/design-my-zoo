// What each animal needs to be happy (GDD section 11): five hearts, a visitor view, and a
// picture checklist for the hint button. Every need comes from char-and-properties.json via
// NeedsData; nothing here knows an animal by name.

import { needsWater } from './animals';
import { areaInfo, checkArea } from './enclosures';
import { squareKey, type Catalogue, type PlacedItem, type Square, type Zoo } from './zoo';

export type HeartId = 'food' | 'water' | 'air' | 'home' | 'safety';

/** The five hearts, in the order they are shown. */
export const HEARTS: readonly HeartId[] = ['food', 'water', 'air', 'home', 'safety'];

export type Gaps = 'none' | 'small' | 'big';

/** One animal's needs, as written in the data file. */
export interface AnimalSpec {
  id: string;
  label: string;
  /** Any one of these is enough. Each can be a ground type or an item. */
  food: readonly string[];
  /** Any one of these is enough. */
  water: readonly string[];
  /** Every group needs one thing present. */
  home: readonly (readonly string[])[];
  /** The animals this one would eat. */
  eats: readonly string[];
  flies: boolean;
  small: boolean;
  livesInWater: boolean;
}

export interface NeedsData {
  animals: readonly AnimalSpec[];
  /** How big the holes in a material are: "none", "small" (fabric net) or "big" (wire mesh). */
  gapsOf(materialId: string): Gaps;
  isTransparent(materialId: string): boolean;
}

/** Why a heart is empty. The panel turns this into a gentle message. */
export type Reason =
  | { kind: 'noFood' }
  | { kind: 'noWater' }
  /** There is a water source, but its material leaks. */
  | { kind: 'leakingWater'; source: string }
  | { kind: 'notInWater' }
  | { kind: 'roofBlocksAir' }
  | { kind: 'noHome'; group: readonly string[] }
  /** Not fenced in, with a small gap that would close it. */
  | { kind: 'gap' }
  /** Not fenced in, and no small gap to fill. */
  | { kind: 'open' }
  | { kind: 'weakFence' }
  | { kind: 'bigGaps' }
  | { kind: 'needsRoof' }
  | { kind: 'roofGapsBig' }
  /** This animal would eat `other`, which shares its area. */
  | { kind: 'eats'; other: string }
  /** `other` shares its area and would eat this animal. */
  | { kind: 'eaten'; other: string };

export interface Heart {
  full: boolean;
  reason: Reason | null;
}

export type View = 'great' | 'okay' | 'none';

/** A thing the hint button ticks off. */
export type HintRule =
  | 'inWater'
  | 'airFlow'
  | 'closedFence'
  | 'strongFence'
  | 'noBigGaps'
  | 'roof'
  | 'netRoof'
  | 'noPredators';

export interface ChecklistItem {
  heart: HeartId;
  /** Ground or item ids to show as pictures ("any one of these"). Empty for rules. */
  options: readonly string[];
  rule: HintRule | null;
  met: boolean;
}

export interface AnimalNeeds {
  animalId: string;
  hearts: Readonly<Record<HeartId, Heart>>;
  /** How many hearts are full, 0 to 5. */
  heartCount: number;
  /** All five hearts are full. */
  happy: boolean;
  /** What visitors can see of the animal. Does not affect happiness. */
  view: View;
  checklist: readonly ChecklistItem[];
}

const FULL: Heart = { full: true, reason: null };
const empty = (reason: Reason): Heart => ({ full: false, reason });

interface AreaEntry {
  squares: Square[];
  keys: Set<string>;
  closed: boolean;
}

/** Areas already worked out for one zoo, so animals in the same area do not repeat the work. */
export type AreaCache = Map<string, AreaEntry>;

export interface EvaluateOptions {
  /**
   * Share area work between animals. Only use one cache for one zoo.
   */
  cache?: AreaCache;
  /**
   * Work out whether a fence that is not closed has a small gap or is just open ("gap" or "open").
   * This is the slow part, so leave it off when only the hearts are counted. Default: on.
   */
  explain?: boolean;
}

/** Works out how happy one animal is, or null if it is not in the zoo. */
export function evaluateAnimal(
  zoo: Zoo,
  catalogue: Catalogue,
  data: NeedsData,
  animalId: string,
  options: EvaluateOptions = {},
): AnimalNeeds | null {
  const spec = data.animals.find((a) => a.id === animalId);
  const animal = zoo.animals.find((a) => a.animalId === animalId);
  if (!spec || !animal) return null;
  const explain = options.explain ?? true;

  // Everything is judged inside the animal's area: its enclosure, or the open ground round it.
  const origin: Square = { col: animal.col, row: animal.row };
  let entry = options.cache?.get(squareKey(origin.col, origin.row));
  if (!entry) {
    const info = areaInfo(zoo.fences, origin);
    const keys = new Set(info.squares.map((s) => squareKey(s.col, s.row)));
    entry = { squares: info.squares, keys, closed: info.closed };
    if (options.cache) for (const key of keys) options.cache.set(key, entry);
  }
  const { squares, closed, keys: area } = entry;

  const itemsInArea = zoo.items.filter((item) => touchesArea(item, area, catalogue));
  // A feature only counts if its material suits its job: a hut that fell down is not shelter.
  const working = itemsInArea.filter((item) => itemWorks(item, catalogue));
  const present = (id: string): boolean =>
    catalogue.isGround(id)
      ? squares.some((s) => zoo.ground[squareKey(s.col, s.row)] === id)
      : working.some((item) => item.kind === id);

  const inWater = !needsWater(zoo, catalogue, animal);
  const fencePieces = boundingFences(zoo, squares);
  const roofMaterial = zoo.roofs[squareKey(origin.col, origin.row)] ?? null;

  // 🍎 Food
  const food = spec.food.some(present) ? FULL : empty({ kind: 'noFood' });

  // 💧 Water
  const placedWater = itemsInArea.filter((item) => spec.water.includes(item.kind));
  const workingWater = placedWater.some((item) => itemWorks(item, catalogue));
  const leaking = placedWater.find((item) => !itemWorks(item, catalogue));
  const water: Heart = workingWater
    ? FULL
    : empty(leaking ? { kind: 'leakingWater', source: leaking.kind } : { kind: 'noWater' });

  // 🌬 Air
  let air = FULL;
  if (spec.livesInWater && !inWater) {
    air = empty({ kind: 'notInWater' });
  } else if (roofMaterial !== null && !catalogue.materialCheck('roof', roofMaterial).works) {
    air = empty({ kind: 'roofBlocksAir' });
  }

  // 🏡 Home: every group needs one thing.
  const missingGroup = spec.home.find((group) => !group.some(present));
  const home = missingGroup ? empty({ kind: 'noHome', group: missingGroup }) : FULL;

  // 🛡 Safety
  const fenceStrong = fencePieces.every((m) => catalogue.materialCheck('fence', m).works);
  const fenceNoBigGaps = fencePieces.every((m) => data.gapsOf(m) !== 'big');
  const hasRoof = roofMaterial !== null;
  const roofNoBigGaps = roofMaterial === null || data.gapsOf(roofMaterial) !== 'big';
  const sharing = zoo.animals.filter(
    (other) => other.animalId !== animalId && area.has(squareKey(other.col, other.row)),
  );
  const prey = sharing.find((other) => spec.eats.includes(other.animalId));
  const predator = sharing.find((other) =>
    data.animals.some((s) => s.id === other.animalId && s.eats.includes(animalId)),
  );
  const safeInPool = spec.livesInWater && inWater;

  let safety = FULL;
  if (!safeInPool && !closed) {
    safety = empty({ kind: explain && checkArea(zoo.fences, origin).kind === 'gap' ? 'gap' : 'open' });
  } else if (!safeInPool && !fenceStrong) {
    safety = empty({ kind: 'weakFence' });
  } else if (!safeInPool && spec.small && !fenceNoBigGaps) {
    safety = empty({ kind: 'bigGaps' });
  } else if (!safeInPool && spec.flies && !hasRoof) {
    safety = empty({ kind: 'needsRoof' });
  } else if (!safeInPool && spec.flies && spec.small && !roofNoBigGaps) {
    safety = empty({ kind: 'roofGapsBig' });
  } else if (prey) {
    safety = empty({ kind: 'eats', other: prey.animalId });
  } else if (predator) {
    safety = empty({ kind: 'eaten', other: predator.animalId });
  }

  const hearts: Record<HeartId, Heart> = { food, water, air, home, safety };
  const heartCount = HEARTS.filter((id) => hearts[id].full).length;

  // 👀 What visitors can see
  let view: View = 'none';
  const seesThroughPool = itemsInArea.some(
    (item) =>
      catalogue.isWaterKind(item.kind) &&
      item.material !== undefined &&
      data.isTransparent(item.material) &&
      itemWorks(item, catalogue) &&
      zoo.animals.some(
        (a) => catalogue.livesInWater(a.animalId) && insideItem(a, item, catalogue) && !needsWater(zoo, catalogue, a),
      ),
  );
  if (seesThroughPool || (closed && fencePieces.some((m) => data.isTransparent(m)))) {
    view = 'great';
  } else if (closed && fencePieces.some((m) => data.gapsOf(m) === 'big')) {
    view = 'okay';
  }

  const checklist = buildChecklist(spec, data, hearts, {
    inWater,
    closed,
    fenceStrong,
    fenceNoBigGaps,
    hasRoof,
    roofNoBigGaps,
    noPredators: !prey && !predator,
    missingGroup,
    present,
  });

  return { animalId, hearts, heartCount, happy: heartCount === HEARTS.length, view, checklist };
}

interface ChecklistFacts {
  inWater: boolean;
  closed: boolean;
  fenceStrong: boolean;
  fenceNoBigGaps: boolean;
  hasRoof: boolean;
  roofNoBigGaps: boolean;
  noPredators: boolean;
  missingGroup: readonly string[] | undefined;
  present(id: string): boolean;
}

/** The picture checklist for the 💡 hint: each thing the animal needs, ticked if it is there. */
function buildChecklist(
  spec: AnimalSpec,
  data: NeedsData,
  hearts: Readonly<Record<HeartId, Heart>>,
  facts: ChecklistFacts,
): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { heart: 'food', options: spec.food, rule: null, met: hearts.food.full },
    { heart: 'water', options: spec.water, rule: null, met: hearts.water.full },
    { heart: 'air', options: [], rule: spec.livesInWater ? 'inWater' : 'airFlow', met: hearts.air.full },
  ];
  for (const group of spec.home) {
    items.push({ heart: 'home', options: group, rule: null, met: group.some(facts.present) });
  }

  const safety = (rule: HintRule, met: boolean) => items.push({ heart: 'safety', options: [], rule, met });
  if (spec.livesInWater) {
    safety('inWater', facts.inWater);
  } else {
    safety('closedFence', facts.closed);
    safety('strongFence', facts.fenceStrong);
    if (spec.small) safety('noBigGaps', facts.fenceNoBigGaps);
    if (spec.flies) safety(spec.small ? 'netRoof' : 'roof', facts.hasRoof && (!spec.small || facts.roofNoBigGaps));
  }
  const involvedInEating = spec.eats.length > 0 || data.animals.some((a) => a.eats.includes(spec.id));
  if (involvedInEating) safety('noPredators', facts.noPredators);
  return items;
}

/** True if the animal's own square is one of the item's squares. */
function insideItem(animal: Square, item: PlacedItem, catalogue: Catalogue): boolean {
  const [width, height] = catalogue.sizeOf(item.kind) ?? [1, 1];
  return (
    animal.col >= item.col && animal.col < item.col + width && animal.row >= item.row && animal.row < item.row + height
  );
}

function itemWorks(item: PlacedItem, catalogue: Catalogue): boolean {
  return !item.material || catalogue.materialCheck(item.kind, item.material).works;
}

/** True if any square of the item is in the area. */
function touchesArea(item: PlacedItem, area: ReadonlySet<string>, catalogue: Catalogue): boolean {
  const [width, height] = catalogue.sizeOf(item.kind) ?? [1, 1];
  for (let col = item.col; col < item.col + width; col++) {
    for (let row = item.row; row < item.row + height; row++) {
      if (area.has(squareKey(col, row))) return true;
    }
  }
  return false;
}

/** The materials of the fence pieces round an area: any fence square touching it, corners included. */
function boundingFences(zoo: Zoo, squares: readonly Square[]): string[] {
  const seen = new Set<string>();
  const materials = new Set<string>();
  for (const { col, row } of squares) {
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const key = squareKey(col + dc, row + dr);
        if (seen.has(key)) continue;
        seen.add(key);
        const material = zoo.fences[key];
        if (material !== undefined) materials.add(material);
      }
    }
  }
  return [...materials];
}
