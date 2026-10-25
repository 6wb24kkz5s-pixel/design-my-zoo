import { describe, expect, it } from 'vitest';
import { featureCatalogue as catalogue, NEEDS_DATA } from '../src/data/content';
import { evaluateAnimal, HEARTS, type AnimalNeeds, type HeartId } from '../src/logic/needs';
import { lineSquares, paintSquares } from '../src/logic/paint';
import { roofArea } from '../src/logic/roofs';
import { canPlaceAnimal, EMPTY_ZOO, placeAnimal, placeItem, type Square, type Zoo } from '../src/logic/zoo';

// ---------------------------------------------------------------------------------------------
// A zoo is described by a "layout", so each test can change one thing and build it again.
// The fenced animals live in a ring of fence from (3,3) to (14,12): its inside is columns 4–13, rows 4–11.
// The fish live in the open, on a pool.
// ---------------------------------------------------------------------------------------------

interface Layout {
  /** Material of the fence ring, or null for no fence. */
  fence: string | null;
  /** Material of a roof over the whole ring, or null for no roof. */
  roof: string | null;
  ground: { id: string; squares: Square[] }[];
  items: { kind: string; col: number; row: number; material?: string }[];
  animals: { id: string; col: number; row: number }[];
}

const RING = { left: 3, top: 3, right: 14, bottom: 12 };

function ringSquares(): Square[] {
  const { left, top, right, bottom } = RING;
  const corners = [
    { col: left, row: top },
    { col: right, row: top },
    { col: right, row: bottom },
    { col: left, row: bottom },
    { col: left, row: top },
  ];
  const squares: Square[] = [];
  for (let i = 1; i < corners.length; i++) squares.push(...lineSquares(corners[i - 1] as Square, corners[i] as Square));
  return squares;
}

function patch(col1: number, row1: number, col2: number, row2: number): Square[] {
  const squares: Square[] = [];
  for (let col = col1; col <= col2; col++) for (let row = row1; row <= row2; row++) squares.push({ col, row });
  return squares;
}

function build(layout: Layout): Zoo {
  let zoo = EMPTY_ZOO;
  if (layout.fence) {
    zoo = paintSquares(zoo, catalogue, { layer: 'fence', value: layout.fence }, ringSquares());
  }
  for (const g of layout.ground) zoo = paintSquares(zoo, catalogue, { layer: 'ground', value: g.id }, g.squares);

  // Pools first, so the water-only items that float on them have somewhere to go.
  const ordered = [...layout.items].sort(
    (a, b) => Number(catalogue.placeOn(a.kind) !== null) - Number(catalogue.placeOn(b.kind) !== null),
  );
  for (const item of ordered) {
    const next = placeItem(zoo, catalogue, item.kind, item.col, item.row, item.material);
    if (!next) throw new Error(`could not place ${item.kind} at ${item.col},${item.row}`);
    zoo = next;
  }

  if (layout.roof) {
    const result = roofArea(zoo, catalogue, { col: 8, row: 8 }, layout.roof);
    if (!result.ok) throw new Error(`could not roof: ${result.reason}`);
    zoo = result.zoo;
  }
  for (const a of layout.animals) {
    const next = placeAnimal(zoo, catalogue, a.id, a.col, a.row);
    if (!next) throw new Error(`could not place ${a.id} at ${a.col},${a.row}`);
    zoo = next;
  }
  return zoo;
}

function needsOf(layout: Layout, animalId: string): AnimalNeeds {
  const needs = evaluateAnimal(build(layout), catalogue, NEEDS_DATA, animalId);
  if (!needs) throw new Error(`${animalId} is not in the zoo`);
  return needs;
}

// Handy positions inside the ring.
const WATER = { col: 5, row: 5 };
const HOME = { col: 9, row: 5 };
const FOOD = { col: 12, row: 5 };
const GROUND = patch(5, 9, 8, 10);
const ANIMAL = { col: 12, row: 9 };

const fenced = (overrides: Partial<Layout>): Layout => ({
  fence: 'wood',
  roof: null,
  ground: [],
  items: [],
  animals: [],
  ...overrides,
});

/** One fully happy setup for each of the 12 animals, written by hand. */
const HAPPY: Record<string, Layout> = {
  frog: fenced({
    ground: [{ id: 'soil', squares: GROUND }],
    items: [
      { kind: 'shallow_pond', ...WATER, material: 'glass' },
      { kind: 'bushes', ...HOME },
      { kind: 'insects', ...FOOD },
    ],
    animals: [{ id: 'frog', ...ANIMAL }],
  }),
  salamander: fenced({
    ground: [{ id: 'mud', squares: GROUND }],
    items: [
      { kind: 'shallow_pond', ...WATER, material: 'glass' },
      { kind: 'hollow_log', ...HOME },
      { kind: 'insects', ...FOOD },
    ],
    animals: [{ id: 'salamander', ...ANIMAL }],
  }),
  hippopotamus: fenced({
    ground: [{ id: 'mud', squares: GROUND }],
    items: [
      { kind: 'deep_pool', ...WATER, material: 'concrete' },
      { kind: 'tall_tree', ...HOME },
      { kind: 'hay', ...FOOD },
    ],
    animals: [{ id: 'hippopotamus', col: 11, row: 9 }],
  }),
  goat: fenced({
    ground: [{ id: 'rocks', squares: GROUND }],
    items: [
      { kind: 'water_bowl', ...WATER, material: 'metal' },
      { kind: 'hut', ...HOME, material: 'wood' },
      { kind: 'hay', ...FOOD },
    ],
    animals: [{ id: 'goat', ...ANIMAL }],
  }),
  crocodile: fenced({
    ground: [{ id: 'sand', squares: GROUND }],
    items: [
      { kind: 'deep_pool', ...WATER, material: 'glass' },
      { kind: 'meat', ...FOOD },
    ],
    animals: [{ id: 'crocodile', col: 11, row: 9 }],
  }),
  snake: fenced({
    items: [
      { kind: 'water_bowl', ...WATER, material: 'metal' },
      { kind: 'rock_cave', ...HOME },
      { kind: 'mice', ...FOOD },
    ],
    animals: [{ id: 'snake', ...ANIMAL }],
  }),
  parrot: fenced({
    roof: 'metal_mesh',
    items: [
      { kind: 'water_bowl', ...WATER, material: 'metal' },
      { kind: 'tall_tree', ...HOME },
      { kind: 'seeds_fruit', ...FOOD },
    ],
    animals: [{ id: 'parrot', ...ANIMAL }],
  }),
  flamingo: fenced({
    roof: 'metal_mesh',
    ground: [{ id: 'mud', squares: GROUND }],
    items: [
      { kind: 'shallow_pond', ...WATER, material: 'glass' },
      { kind: 'shrimp', col: 6, row: 5 },
    ],
    animals: [{ id: 'flamingo', ...ANIMAL }],
  }),
  beetle: fenced({
    roof: 'fabric_net',
    ground: [{ id: 'soil', squares: GROUND }],
    items: [
      { kind: 'mist_sprayer', ...WATER },
      { kind: 'hollow_log', ...HOME },
      { kind: 'rotting_fruit', ...FOOD },
    ],
    animals: [{ id: 'beetle', ...ANIMAL }],
  }),
  dragonfly: fenced({
    roof: 'fabric_net',
    items: [
      { kind: 'shallow_pond', ...WATER, material: 'glass' },
      { kind: 'water_plants', col: 6, row: 5 },
      { kind: 'insects', ...FOOD },
    ],
    animals: [{ id: 'dragonfly', ...ANIMAL }],
  }),
  // The fish live in the open, with no fence: a fish in a pool counts as safe.
  koi: {
    fence: null,
    roof: null,
    ground: [],
    items: [
      { kind: 'deep_pool', col: 20, row: 6, material: 'glass' },
      { kind: 'fish_food', col: 21, row: 6 },
      { kind: 'water_plants', col: 22, row: 7 },
    ],
    animals: [{ id: 'koi', col: 21, row: 7 }],
  },
  goldfish: {
    fence: null,
    roof: null,
    ground: [],
    items: [
      { kind: 'shallow_pond', col: 20, row: 6, material: 'clear_plastic' },
      { kind: 'fish_food', col: 21, row: 6 },
      { kind: 'water_plants', col: 22, row: 6 },
    ],
    animals: [{ id: 'goldfish', col: 21, row: 6 }],
  },
};

const ALL_IDS = NEEDS_DATA.animals.map((a) => a.id);
const specOf = (id: string) => NEEDS_DATA.animals.find((a) => a.id === id)!;
const clone = (layout: Layout): Layout => structuredClone(layout);

/** The layout without these foods, water sources, or home things (and whatever floats on a removed pool). */
function without(layout: Layout, ids: readonly string[]): Layout {
  const l = clone(layout);
  const removesWater = ids.some((id) => catalogue.isWaterKind(id));
  l.items = l.items.filter(
    (item) => !ids.includes(item.kind) && !(removesWater && catalogue.placeOn(item.kind) === 'water'),
  );
  l.ground = l.ground.filter((g) => !ids.includes(g.id));
  return l;
}

/** A spot inside the given part of the plot where this animal fits. */
function spotFor(zoo: Zoo, animalId: string, cols: [number, number], rows: [number, number]): Square {
  for (let row = rows[0]; row <= rows[1]; row++) {
    for (let col = cols[0]; col <= cols[1]; col++) {
      if (canPlaceAnimal(zoo, catalogue, animalId, col, row)) return { col, row };
    }
  }
  throw new Error(`no room for ${animalId}`);
}

function expectEmpty(needs: AnimalNeeds, heart: HeartId, kind: string): void {
  expect(needs.hearts[heart].full, `${heart} heart`).toBe(false);
  expect(needs.hearts[heart].reason?.kind, `${heart} reason`).toBe(kind);
  expect(needs.happy).toBe(false);
}

describe('the happy setups', () => {
  it('has a recipe for every animal in the data file', () => {
    expect(Object.keys(HAPPY).sort()).toEqual([...ALL_IDS].sort());
  });

  it.each(ALL_IDS)('makes the %s fully happy', (id) => {
    const needs = needsOf(HAPPY[id] as Layout, id);
    for (const heart of HEARTS) expect(needs.hearts[heart], `${id} ${heart}`).toEqual({ full: true, reason: null });
    expect(needs.heartCount).toBe(5);
    expect(needs.happy).toBe(true);
    // The hint checklist ticks off everything.
    expect(needs.checklist.length).toBeGreaterThan(3);
    expect(needs.checklist.every((item) => item.met), `${id} checklist`).toBe(true);
  });
});

describe('breaking one heart at a time', () => {
  describe.each(ALL_IDS)('%s', (id) => {
    const happy = HAPPY[id] as Layout;
    const spec = specOf(id);

    it('🍎 loses its food', () => {
      expectEmpty(needsOf(without(happy, spec.food), id), 'food', 'noFood');
    });

    it('💧 loses its water', () => {
      expectEmpty(needsOf(without(happy, spec.water), id), 'water', 'noWater');
    });

    it('💧 has water that leaks (when the source has a material)', () => {
      const l = clone(happy);
      let changed = false;
      for (const item of l.items) {
        if (spec.water.includes(item.kind) && catalogue.materialsFor(item.kind).includes('fabric')) {
          item.material = 'fabric';
          changed = true;
        }
      }
      if (!changed) return; // e.g. the beetle's mist sprayer has no material
      expectEmpty(needsOf(l, id), 'water', 'leakingWater');
    });

    it('🌬 loses its air', () => {
      if (spec.livesInWater) {
        const l = clone(happy);
        l.animals = [{ id, col: 30, row: 15 }]; // out of the water
        expectEmpty(needsOf(l, id), 'air', 'notInWater');
      } else {
        const l = clone(happy);
        l.roof = 'glass'; // a roof that keeps out fresh air
        expectEmpty(needsOf(l, id), 'air', 'roofBlocksAir');
      }
    });

    it.each(spec.home.map((group, index) => ({ index, group })))('🏡 loses home group $index', ({ group }) => {
      const needs = needsOf(without(happy, group), id);
      expectEmpty(needs, 'home', 'noHome');
      expect(needs.hearts.home.reason).toEqual({ kind: 'noHome', group });
    });

    if (!spec.livesInWater) {
      it('🛡 has a gap in the fence', () => {
        const zoo = paintSquares(build(happy), catalogue, { layer: 'fence', value: null }, [{ col: 8, row: 3 }]);
        const needs = evaluateAnimal(zoo, catalogue, NEEDS_DATA, id)!;
        expectEmpty(needs, 'safety', 'gap');
      });

      it('🛡 has a fence that is not strong', () => {
        const l = clone(happy);
        l.fence = 'fabric';
        expectEmpty(needsOf(l, id), 'safety', 'weakFence');
      });

      if (spec.small) {
        it('🛡 is small and the fence has big gaps', () => {
          const l = clone(happy);
          l.fence = 'metal_mesh';
          expectEmpty(needsOf(l, id), 'safety', 'bigGaps');
        });
      } else {
        it('🛡 is not small, so a wire mesh fence is fine', () => {
          const l = clone(happy);
          l.fence = 'metal_mesh';
          expect(needsOf(l, id).hearts.safety.full).toBe(true);
        });
      }

      if (spec.flies) {
        it('🛡 flies and has no roof', () => {
          const l = clone(happy);
          l.roof = null;
          expectEmpty(needsOf(l, id), 'safety', 'needsRoof');
        });
      }

      if (spec.flies && spec.small) {
        it('🛡 is small and flies, so a wire mesh roof is not enough', () => {
          const l = clone(happy);
          l.roof = 'metal_mesh';
          const needs = needsOf(l, id);
          expectEmpty(needs, 'safety', 'roofGapsBig');
          expect(needs.hearts.air.full).toBe(true);
        });
      }
    }

    // Something that would eat it, in the same area.
    const eater = NEEDS_DATA.animals.find((a) => a.eats.includes(id));
    if (eater) {
      it(`🛡 shares with the ${eater.id}, which would eat it`, () => {
        const zoo = build(happy);
        const inRing: [[number, number], [number, number]] = spec.livesInWater
          ? [[24, 30], [4, 15]]
          : [[4, 13], [4, 11]];
        const spot = spotFor(zoo, eater.id, inRing[0], inRing[1]);
        const shared = placeAnimal(zoo, catalogue, eater.id, spot.col, spot.row) as Zoo;
        const needs = evaluateAnimal(shared, catalogue, NEEDS_DATA, id)!;
        expectEmpty(needs, 'safety', 'eaten');
        expect(needs.hearts.safety.reason).toEqual({ kind: 'eaten', other: eater.id });
      });
    }
  });
});

describe('sharing work between animals', () => {
  it('gives the same hearts with or without the shortcuts, for every setup and every broken setup', () => {
    for (const id of ALL_IDS) {
      const happy = HAPPY[id] as Layout;
      // A roof (and a weak fence) only make sense for the animals that live inside a fence.
      const layouts = happy.fence
        ? [happy, { ...clone(happy), roof: 'glass' }, { ...clone(happy), fence: 'fabric' }]
        : [happy];
      for (const layout of layouts) {
        const zoo = build(layout);
        const plain = evaluateAnimal(zoo, catalogue, NEEDS_DATA, id)!;
        const fast = evaluateAnimal(zoo, catalogue, NEEDS_DATA, id, { cache: new Map(), explain: false })!;
        expect(fast.heartCount, id).toBe(plain.heartCount);
        for (const heart of HEARTS) expect(fast.hearts[heart].full, `${id} ${heart}`).toBe(plain.hearts[heart].full);
        expect(fast.happy).toBe(plain.happy);
      }
    }
  });

  it('shares one cache across animals in the same area', () => {
    const l = clone(HAPPY.koi as Layout);
    l.animals.push({ id: 'goldfish', col: 21, row: 8 }); // both fish in the same open ground
    const zoo = build(l);
    const cache = new Map();
    for (const id of ['koi', 'goldfish']) evaluateAnimal(zoo, catalogue, NEEDS_DATA, id, { cache, explain: false });
    expect(cache.get('21,7')).toBe(cache.get('21,8')); // the very same area, worked out once
  });
});

describe('who eats whom', () => {
  it('empties both hearts: the crocodile might eat, and the frog is not safe', () => {
    const l = clone(HAPPY.frog as Layout);
    l.animals.push({ id: 'crocodile', col: 4, row: 4 });
    const frog = needsOf(l, 'frog');
    const crocodile = needsOf(l, 'crocodile');
    expect(frog.hearts.safety.reason).toEqual({ kind: 'eaten', other: 'crocodile' });
    expect(crocodile.hearts.safety.reason).toEqual({ kind: 'eats', other: 'frog' });
  });

  it('does nothing when they live in separate fenced areas', () => {
    let zoo = paintSquares(EMPTY_ZOO, catalogue, { layer: 'fence', value: 'wood' }, [
      ...ringOf(3, 3, 9, 9),
      ...ringOf(12, 3, 18, 9),
    ]);
    zoo = placeAnimal(zoo, catalogue, 'crocodile', 5, 5) as Zoo;
    zoo = placeAnimal(zoo, catalogue, 'frog', 14, 5) as Zoo;
    const frog = evaluateAnimal(zoo, catalogue, NEEDS_DATA, 'frog')!;
    const crocodile = evaluateAnimal(zoo, catalogue, NEEDS_DATA, 'crocodile')!;
    expect(frog.hearts.safety.full).toBe(true);
    expect(crocodile.hearts.safety.full).toBe(true);
  });

  it('keeps a fish in a pool safe without a fence, but not from a crocodile in the same open ground', () => {
    const koi = needsOf(HAPPY.koi as Layout, 'koi');
    expect(koi.hearts.safety.full).toBe(true);
    const l = clone(HAPPY.koi as Layout);
    l.animals.push({ id: 'crocodile', col: 25, row: 10 });
    expect(needsOf(l, 'koi').hearts.safety.reason).toEqual({ kind: 'eaten', other: 'crocodile' });
  });
});

describe('features that do not work do not count', () => {
  it('a hut that fell down is not shelter', () => {
    const l = clone(HAPPY.goat as Layout);
    l.items = l.items.map((i) => (i.kind === 'hut' ? { ...i, material: 'fabric' } : i));
    const needs = needsOf(l, 'goat');
    expectEmpty(needs, 'home', 'noHome');
    expect(needs.hearts.home.reason).toEqual({ kind: 'noHome', group: ['hut', 'shade_cover'] });
  });

  it('a shade cover only counts if it is not transparent', () => {
    const base = clone(HAPPY.hippopotamus as Layout);
    base.items = base.items.map((i) => (i.kind === 'tall_tree' ? { kind: 'shade_cover', col: i.col, row: i.row, material: 'glass' } : i));
    expect(needsOf(base, 'hippopotamus').hearts.home.full).toBe(false);
    base.items = base.items.map((i) => (i.kind === 'shade_cover' ? { ...i, material: 'wood' } : i));
    expect(needsOf(base, 'hippopotamus').hearts.home.full).toBe(true);
  });

  it('a swing only counts if it is strong enough to hold the parrot', () => {
    const base = clone(HAPPY.parrot as Layout);
    base.items = base.items.map((i) => (i.kind === 'tall_tree' ? { kind: 'swing', col: i.col, row: i.row, material: 'fabric' } : i));
    expect(needsOf(base, 'parrot').hearts.home.full).toBe(false);
    base.items = base.items.map((i) => (i.kind === 'swing' ? { ...i, material: 'metal' } : i));
    expect(needsOf(base, 'parrot').hearts.home.full).toBe(true);
  });

  it('a pool the hippo needs for its home does not count if it leaks', () => {
    const l = clone(HAPPY.hippopotamus as Layout);
    l.items = l.items.map((i) => (i.kind === 'deep_pool' ? { ...i, material: 'fabric' } : i));
    const needs = needsOf(l, 'hippopotamus');
    expect(needs.hearts.home.full).toBe(false);
    expect(needs.hearts.water.reason).toEqual({ kind: 'leakingWater', source: 'deep_pool' });
  });

  it('grass painted on the ground counts as food for the hippo', () => {
    const l = clone(HAPPY.hippopotamus as Layout);
    l.items = l.items.filter((i) => i.kind !== 'hay');
    expect(needsOf(l, 'hippopotamus').hearts.food.full).toBe(false);
    l.ground.push({ id: 'grass', squares: patch(9, 9, 10, 10) });
    expect(needsOf(l, 'hippopotamus').hearts.food.full).toBe(true);
  });
});

describe('what visitors can see', () => {
  const viewWith = (fence: string) => {
    const l = clone(HAPPY.goat as Layout);
    l.fence = fence;
    return needsOf(l, 'goat');
  };

  it('is great through glass or clear plastic, okay through wire mesh, and nothing through the rest', () => {
    expect(viewWith('glass').view).toBe('great');
    expect(viewWith('clear_plastic').view).toBe('great');
    expect(viewWith('metal_mesh').view).toBe('okay');
    expect(viewWith('wood').view).toBe('none');
    expect(viewWith('concrete').view).toBe('none');
    expect(viewWith('fabric').view).toBe('none');
  });

  it('is great when any one fence piece is transparent', () => {
    const zoo = paintSquares(build(HAPPY.goat as Layout), catalogue, { layer: 'fence', value: 'glass' }, [{ col: 8, row: 3 }]);
    expect(evaluateAnimal(zoo, catalogue, NEEDS_DATA, 'goat')!.view).toBe('great');
  });

  it('is great for a fish in a transparent pool, and nothing for a fish in a concrete one', () => {
    expect(needsOf(HAPPY.koi as Layout, 'koi').view).toBe('great');
    const l = clone(HAPPY.koi as Layout);
    l.items = l.items.map((i) => (i.kind === 'deep_pool' ? { ...i, material: 'concrete' } : i));
    expect(needsOf(l, 'koi').view).toBe('none');
  });

  it('is nothing for an animal that is not fenced in, and never changes happiness', () => {
    const l = clone(HAPPY.goat as Layout);
    l.fence = 'glass';
    const great = needsOf(l, 'goat');
    const none = needsOf(HAPPY.goat as Layout, 'goat');
    expect(great.view).toBe('great');
    expect(none.view).toBe('none');
    expect(great.happy).toBe(true);
    expect(none.happy).toBe(true);
  });
});

function ringOf(left: number, top: number, right: number, bottom: number): Square[] {
  const corners = [
    { col: left, row: top },
    { col: right, row: top },
    { col: right, row: bottom },
    { col: left, row: bottom },
    { col: left, row: top },
  ];
  const squares: Square[] = [];
  for (let i = 1; i < corners.length; i++) squares.push(...lineSquares(corners[i - 1] as Square, corners[i] as Square));
  return squares;
}
