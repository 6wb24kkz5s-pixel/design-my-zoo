import { describe, expect, it } from 'vitest';
import { featureCatalogue as catalogue } from '../src/data/content';
import { areaInfo, gapView } from '../src/logic/enclosures';
import { fits, findPath, peekPlan, rectKeys, strollOptions, swimSquares, type Cell } from '../src/logic/behaviour';
import { lineSquares, paintSquares } from '../src/logic/paint';
import { EMPTY_ZOO, placeAnimal, placeItem, squareKey, type Size, type Square, type Zoo } from '../src/logic/zoo';

const ONE: Size = [1, 1];
const keys = (squares: readonly Square[]) => new Set(squares.map((s) => squareKey(s.col, s.row)));

function ringSquares(left: number, top: number, right: number, bottom: number): Square[] {
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

/** A wooden ring from (3,3) to (12,10), with the given pieces taken out. */
function ring(remove: Square[] = []): Zoo {
  const removed = new Set(remove.map((s) => squareKey(s.col, s.row)));
  const squares = ringSquares(3, 3, 12, 10).filter((s) => !removed.has(squareKey(s.col, s.row)));
  return paintSquares(EMPTY_ZOO, catalogue, { layer: 'fence', value: 'wood' }, squares);
}

describe('strolling', () => {
  const area = (zoo: Zoo, at: Cell) => keys(areaInfo(zoo.fences, at).squares);

  it('offers spots up to 2 squares away, inside the fence, including where it already is', () => {
    const zoo = ring();
    const options = strollOptions({ col: 7, row: 6 }, ONE, area(zoo, { col: 7, row: 6 }), new Set(), 2);
    expect(options).toHaveLength(25);
    expect(options).toContainEqual({ col: 7, row: 6 });
    for (const o of options) {
      expect(Math.abs(o.col - 7)).toBeLessThanOrEqual(2);
      expect(Math.abs(o.row - 6)).toBeLessThanOrEqual(2);
    }
  });

  it('never offers a fence square or a spot outside the enclosure', () => {
    const zoo = ring();
    const near = strollOptions({ col: 4, row: 4 }, ONE, area(zoo, { col: 4, row: 4 }), new Set(), 2);
    expect(near.every((o) => o.col >= 4 && o.row >= 4)).toBe(true);
    expect(near).toHaveLength(9);
    expect(near.some((o) => zoo.fences[squareKey(o.col, o.row)] !== undefined)).toBe(false);
  });

  it('keeps off other animals', () => {
    const zoo = ring();
    const blocked = new Set(rectKeys({ col: 8, row: 6 }, ONE));
    const options = strollOptions({ col: 7, row: 6 }, ONE, area(zoo, { col: 7, row: 6 }), blocked, 2);
    expect(options).not.toContainEqual({ col: 8, row: 6 });
    expect(options).toHaveLength(24);
  });

  it('only offers a spot where all of a big animal fits', () => {
    const zoo = ring();
    const allowed = area(zoo, { col: 5, row: 5 });
    const hippo: Size = [2, 2];
    const options = strollOptions({ col: 4, row: 4 }, hippo, allowed, new Set(), 2);
    for (const o of options) expect(fits(o, hippo, allowed, new Set())).toBe(true);
    expect(options.some((o) => o.col === 3 || o.row === 3)).toBe(false); // would be on the fence
    expect(options).toContainEqual({ col: 4, row: 4 });
  });
});

describe('walking from spot to spot', () => {
  const room = new Set(rectKeys({ col: 0, row: 0 }, [6, 6]));

  it('goes one square up, down, left or right at a time', () => {
    const path = findPath({ col: 0, row: 0 }, { col: 3, row: 2 }, ONE, room, new Set()) as Cell[];
    expect(path).toHaveLength(5);
    let last: Cell = { col: 0, row: 0 };
    for (const step of path) {
      expect(Math.abs(step.col - last.col) + Math.abs(step.row - last.row)).toBe(1);
      last = step;
    }
    expect(last).toEqual({ col: 3, row: 2 });
  });

  it('goes round something in the way', () => {
    const wall = new Set(rectKeys({ col: 1, row: 0 }, [1, 4]));
    const path = findPath({ col: 0, row: 0 }, { col: 2, row: 0 }, ONE, room, wall) as Cell[];
    expect(path.length).toBeGreaterThan(2);
    expect(path.some((s) => wall.has(squareKey(s.col, s.row)))).toBe(false);
  });

  it('says there is no way if it is boxed in, or if the end is not allowed', () => {
    const wall = new Set(rectKeys({ col: 1, row: 0 }, [1, 6]));
    expect(findPath({ col: 0, row: 0 }, { col: 3, row: 0 }, ONE, room, wall)).toBeNull();
    expect(findPath({ col: 0, row: 0 }, { col: 9, row: 9 }, ONE, room, new Set())).toBeNull();
    expect(findPath({ col: 2, row: 2 }, { col: 2, row: 2 }, ONE, room, new Set())).toEqual([]);
  });
});

describe('swimming', () => {
  it('keeps a fish inside the pool or pond it is in', () => {
    const pool = placeItem(EMPTY_ZOO, catalogue, 'deep_pool', 6, 6, 'glass') as Zoo;
    const withFish = placeAnimal(pool, catalogue, 'koi', 7, 7) as Zoo;
    const squares = swimSquares(withFish, catalogue, withFish.animals[0]!);
    expect(squares.size).toBe(9);
    expect(squares.has('7,7')).toBe(true);
    expect(squares.has('5,5')).toBe(false);

    const pond = placeItem(EMPTY_ZOO, catalogue, 'shallow_pond', 6, 6, 'concrete') as Zoo;
    const inPond = placeAnimal(pond, catalogue, 'goldfish', 8, 7) as Zoo;
    expect(swimSquares(inPond, catalogue, inPond.animals[0]!).size).toBe(6);
  });

  it('does not let a fish swim on dry land or in a leaking pool', () => {
    const dry = placeAnimal(EMPTY_ZOO, catalogue, 'koi', 7, 7) as Zoo;
    expect(swimSquares(dry, catalogue, dry.animals[0]!).size).toBe(0);
    const leaking = placeAnimal(placeItem(EMPTY_ZOO, catalogue, 'deep_pool', 6, 6, 'fabric') as Zoo, catalogue, 'koi', 7, 7) as Zoo;
    expect(swimSquares(leaking, catalogue, leaking.animals[0]!).size).toBe(0);
  });
});

describe('looking out of a gap', () => {
  const gapAt = { col: 8, row: 3 };

  it('finds the animal\'s own side of a gap, and the gap itself', () => {
    const zoo = ring([gapAt]);
    const view = gapView(zoo.fences, { col: 6, row: 6 });
    expect(view).not.toBeNull();
    expect(view?.gaps).toEqual([gapAt]);
    const inner = keys(view?.inner ?? []);
    expect(inner.has('6,6')).toBe(true);
    expect(inner.has(squareKey(gapAt.col, gapAt.row))).toBe(false); // the gap is not "inside"
    expect(inner.has('8,2')).toBe(false); // nor is the outside
    expect(inner.size).toBe(8 * 6); // the whole inside of the ring: columns 4–11, rows 4–9
  });

  it('has nothing to look out of if the fence is closed', () => {
    expect(gapView(ring().fences, { col: 6, row: 6 })).toBeNull();
  });

  it('goes to the nearest gap, stays on its own side, and steps into the gap square only', () => {
    const zoo = ring([{ col: 8, row: 3 }, { col: 12, row: 8 }]);
    const view = gapView(zoo.fences, { col: 5, row: 5 })!;
    const inner = keys(view.inner);
    const plan = peekPlan(inner, view.gaps, { col: 5, row: 5 }, new Set());
    expect(plan?.gap).toEqual({ col: 8, row: 3 });
    expect(inner.has(squareKey(plan!.approach.col, plan!.approach.row))).toBe(true);
    expect(Math.max(Math.abs(plan!.approach.col - 8), Math.abs(plan!.approach.row - 3))).toBe(1);
  });

  it('never leaves: every step of the way there is on the animal\'s own side', () => {
    const zoo = ring([gapAt]);
    const view = gapView(zoo.fences, { col: 5, row: 6 })!;
    const inner = keys(view.inner);
    const plan = peekPlan(inner, view.gaps, { col: 5, row: 6 }, new Set())!;
    const path = findPath({ col: 5, row: 6 }, plan.approach, ONE, inner, new Set()) as Cell[];
    expect(path.length).toBeGreaterThan(0);
    for (const step of path) expect(inner.has(squareKey(step.col, step.row))).toBe(true);
  });

  it('skips a gap another animal is already at', () => {
    const zoo = ring([gapAt]);
    const view = gapView(zoo.fences, { col: 6, row: 6 })!;
    const blocked = new Set([squareKey(gapAt.col, gapAt.row)]);
    expect(peekPlan(keys(view.inner), view.gaps, { col: 6, row: 6 }, blocked)).toBeNull();
  });

  it('also finds a diagonal gap, which is a square at the corner', () => {
    const zoo = ring([{ col: 12, row: 10 }]);
    const view = gapView(zoo.fences, { col: 6, row: 6 })!;
    expect(view.gaps).toEqual([{ col: 12, row: 10 }]);
    const plan = peekPlan(keys(view.inner), view.gaps, { col: 6, row: 6 }, new Set());
    expect(plan?.approach).toEqual({ col: 11, row: 9 });
  });
});
