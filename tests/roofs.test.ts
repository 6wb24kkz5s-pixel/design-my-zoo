import { describe, expect, it } from 'vitest';
import { lineSquares } from '../src/logic/paint';
import { removeRoofArea, roofArea } from '../src/logic/roofs';
import { squareKey, type Square, type SquareMap, type Zoo, EMPTY_ZOO } from '../src/logic/zoo';
import { fakeCatalogue as catalogue } from './helpers';

function ringFences(left: number, top: number, right: number, bottom: number, remove: Square[] = []): SquareMap {
  const corners = [
    { col: left, row: top },
    { col: right, row: top },
    { col: right, row: bottom },
    { col: left, row: bottom },
    { col: left, row: top },
  ];
  const fences: Record<string, string> = {};
  for (let i = 1; i < corners.length; i++) {
    for (const s of lineSquares(corners[i - 1] as Square, corners[i] as Square)) fences[squareKey(s.col, s.row)] = 'wood';
  }
  for (const s of remove) delete fences[squareKey(s.col, s.row)];
  return fences;
}

const zooWith = (fences: SquareMap, roofs: SquareMap = {}): Zoo => ({ ...EMPTY_ZOO, fences, roofs });

describe('roofs', () => {
  it('roofs a whole closed enclosure with one tap', () => {
    const zoo = zooWith(ringFences(5, 5, 10, 9));
    const result = roofArea(zoo, catalogue, { col: 7, row: 7 }, 'net');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.zoo.roofs)).toHaveLength(4 * 3);
      expect(Object.values(result.zoo.roofs).every((m) => m === 'net')).toBe(true);
      expect(result.zoo.roofs[squareKey(5, 5)]).toBeUndefined();
      expect(result.zoo.roofs[squareKey(6, 6)]).toBe('net');
    }
  });

  it('does not roof an area with a gap, or open ground', () => {
    const gap = zooWith(ringFences(5, 5, 10, 9, [{ col: 8, row: 5 }]));
    expect(roofArea(gap, catalogue, { col: 7, row: 7 }, 'net')).toEqual({ ok: false, reason: 'needsFence' });
    expect(roofArea(EMPTY_ZOO, catalogue, { col: 7, row: 7 }, 'net')).toEqual({ ok: false, reason: 'needsFence' });
  });

  it('does nothing on a fence square, the path, or an unknown material', () => {
    const zoo = zooWith(ringFences(5, 5, 10, 9));
    expect(roofArea(zoo, catalogue, { col: 5, row: 5 }, 'net')).toEqual({ ok: false, reason: 'nothing' });
    expect(roofArea(zoo, catalogue, { col: 0, row: 0 }, 'net')).toEqual({ ok: false, reason: 'nothing' });
    expect(roofArea(zoo, catalogue, { col: 7, row: 7 }, 'wood')).toEqual({ ok: false, reason: 'nothing' });
  });

  it('replaces the roof material, and says nothing changed if it is the same', () => {
    const zoo = zooWith(ringFences(5, 5, 10, 9));
    const first = roofArea(zoo, catalogue, { col: 7, row: 7 }, 'net');
    if (!first.ok) throw new Error('could not roof');
    const second = roofArea(first.zoo, catalogue, { col: 7, row: 7 }, 'glass');
    expect(second.ok && Object.values(second.zoo.roofs).every((m) => m === 'glass')).toBe(true);
    const same = roofArea(first.zoo, catalogue, { col: 8, row: 8 }, 'net');
    expect(same.ok && same.zoo === first.zoo).toBe(true);
  });

  it('roofs a ring inside a ring separately', () => {
    const zoo = zooWith({ ...ringFences(3, 3, 15, 13), ...ringFences(7, 6, 11, 10) });
    const inner = roofArea(zoo, catalogue, { col: 9, row: 8 }, 'net');
    if (!inner.ok) throw new Error('could not roof the inner ring');
    expect(Object.keys(inner.zoo.roofs)).toHaveLength(3 * 3);
    expect(inner.zoo.roofs[squareKey(4, 4)]).toBeUndefined();
  });

  it('takes a roof off one enclosure and leaves the others', () => {
    const zoo = zooWith({ ...ringFences(3, 3, 8, 8), ...ringFences(12, 3, 17, 8) });
    const a = roofArea(zoo, catalogue, { col: 5, row: 5 }, 'net');
    if (!a.ok) throw new Error('roof a');
    const b = roofArea(a.zoo, catalogue, { col: 14, row: 5 }, 'glass');
    if (!b.ok) throw new Error('roof b');
    const removed = removeRoofArea(b.zoo, { col: 5, row: 5 });
    expect(Object.values(removed.roofs).every((m) => m === 'glass')).toBe(true);
    expect(Object.keys(removed.roofs)).toHaveLength(4 * 4);
  });

  it('returns the same zoo when there is no roof to remove', () => {
    const zoo = zooWith(ringFences(5, 5, 10, 9));
    expect(removeRoofArea(zoo, { col: 7, row: 7 })).toBe(zoo);
    expect(removeRoofArea(zoo, { col: 0, row: 0 })).toBe(zoo);
  });
});
