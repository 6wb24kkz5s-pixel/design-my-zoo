import { describe, expect, it } from 'vitest';
import { checkArea, findEnclosures } from '../src/logic/enclosures';
import { lineSquares } from '../src/logic/paint';
import { squareKey, type Square, type SquareMap } from '../src/logic/zoo';

/** Fences along the edge of a rectangle (inclusive corners). */
function ring(left: number, top: number, right: number, bottom: number): Square[] {
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

function fencesFrom(squares: Square[], remove: Square[] = []): SquareMap {
  const map: Record<string, string> = {};
  for (const s of squares) map[squareKey(s.col, s.row)] = 'wood';
  for (const s of remove) delete map[squareKey(s.col, s.row)];
  return map;
}

const sorted = (squares: Square[]) => squares.map((s) => squareKey(s.col, s.row)).sort();

describe('closed areas', () => {
  it('finds a closed square', () => {
    const fences = fencesFrom(ring(5, 5, 10, 9));
    const result = checkArea(fences, { col: 7, row: 7 });
    expect(result.kind).toBe('closed');
    if (result.kind === 'closed') expect(result.squares).toHaveLength(4 * 3);
    expect(findEnclosures(fences)).toHaveLength(1);
  });

  it('treats the outside of a ring as not closed in', () => {
    const fences = fencesFrom(ring(5, 5, 10, 9));
    expect(checkArea(fences, { col: 2, row: 2 }).kind).toBe('open');
  });

  it('finds an enclosure inside an enclosure as two separate areas', () => {
    const fences = fencesFrom([...ring(3, 3, 15, 13), ...ring(7, 6, 11, 10)]);
    const inner = checkArea(fences, { col: 9, row: 8 });
    const between = checkArea(fences, { col: 4, row: 4 });
    expect(inner.kind).toBe('closed');
    expect(between.kind).toBe('closed');
    if (inner.kind === 'closed' && between.kind === 'closed') {
      expect(inner.squares).toHaveLength(3 * 3);
      expect(between.squares).toHaveLength(11 * 9 - 5 * 5);
      const innerKeys = new Set(sorted(inner.squares));
      expect(between.squares.some((s) => innerKeys.has(squareKey(s.col, s.row)))).toBe(false);
    }
    expect(findEnclosures(fences)).toHaveLength(2);
  });

  it('does not count three fences against the visitor path as closed', () => {
    // Left, bottom and right sides only; the top side is the edge of the building area.
    const fences = fencesFrom([
      ...lineSquares({ col: 4, row: 1 }, { col: 4, row: 6 }),
      ...lineSquares({ col: 4, row: 6 }, { col: 9, row: 6 }),
      ...lineSquares({ col: 9, row: 6 }, { col: 9, row: 1 }),
    ]);
    expect(checkArea(fences, { col: 6, row: 3 }).kind).not.toBe('closed');
  });

  it('says "none" for a fence square or a square on the path', () => {
    const fences = fencesFrom(ring(5, 5, 10, 9));
    expect(checkArea(fences, { col: 5, row: 5 }).kind).toBe('none');
    expect(checkArea(fences, { col: 0, row: 0 }).kind).toBe('none');
  });
});

describe('gaps', () => {
  it('finds a single missing fence piece', () => {
    const fences = fencesFrom(ring(5, 5, 10, 9), [{ col: 8, row: 5 }]);
    const result = checkArea(fences, { col: 7, row: 7 });
    expect(result).toEqual({ kind: 'gap', gaps: [{ col: 8, row: 5 }] });
  });

  it('finds a diagonal gap between two fence pieces that only touch at the corner', () => {
    // A ring with its bottom-right corner missing: the right side ends at (10,8) and
    // the bottom side ends at (9,9), so they touch only at a corner.
    const fences = fencesFrom(ring(5, 5, 10, 9), [{ col: 10, row: 9 }]);
    const result = checkArea(fences, { col: 7, row: 7 });
    expect(result.kind).toBe('gap');
    if (result.kind === 'gap') {
      // Filling the outside corner square closes the ring.
      expect(sorted(result.gaps)).toEqual(['10,9']);
    }
  });

  it('finds a gap 3 squares wide, but not a very wide opening', () => {
    const three = fencesFrom(ring(5, 5, 12, 10), [6, 7, 8].map((col) => ({ col, row: 10 })));
    const result = checkArea(three, { col: 8, row: 7 });
    expect(result.kind).toBe('gap');
    if (result.kind === 'gap') expect(sorted(result.gaps)).toEqual(['6,10', '7,10', '8,10']);

    const wide = fencesFrom(ring(5, 5, 12, 10), [6, 7, 8, 9, 10, 11].map((col) => ({ col, row: 10 })));
    expect(checkArea(wide, { col: 8, row: 7 }).kind).toBe('open');
  });

  it('finds two gaps at once', () => {
    const fences = fencesFrom(ring(5, 5, 12, 10), [
      { col: 8, row: 5 },
      { col: 12, row: 8 },
    ]);
    const result = checkArea(fences, { col: 8, row: 7 });
    expect(result.kind).toBe('gap');
    if (result.kind === 'gap') expect(sorted(result.gaps)).toEqual(['12,8', '8,5']);
  });

  it('does not mark narrow passages inside a ring as gaps', () => {
    // A wall inside the ring leaves a 1-square passage; the only real gap is in the outer ring.
    const fences = fencesFrom(
      [...ring(4, 4, 16, 12), ...lineSquares({ col: 10, row: 5 }, { col: 10, row: 10 })],
      [{ col: 4, row: 8 }],
    );
    const result = checkArea(fences, { col: 6, row: 8 });
    expect(result).toEqual({ kind: 'gap', gaps: [{ col: 4, row: 8 }] });
    const farSide = checkArea(fences, { col: 14, row: 8 });
    expect(farSide).toEqual({ kind: 'gap', gaps: [{ col: 4, row: 8 }] });
  });

  it('becomes closed again when the gap is filled', () => {
    const broken = fencesFrom(ring(5, 5, 10, 9), [{ col: 8, row: 5 }]);
    const fixed = { ...broken, [squareKey(8, 5)]: 'glass' };
    expect(checkArea(fixed, { col: 7, row: 7 }).kind).toBe('closed');
  });
});
