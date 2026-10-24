import { describe, expect, it } from 'vitest';
import { lineSquares, paintSquares, type PaintTool } from '../src/logic/paint';
import { canPlace, EMPTY_ZOO, placeItem, squareKey, type Square, type Zoo } from '../src/logic/zoo';
import { fakeCatalogue as catalogue } from './helpers';

const wood: PaintTool = { layer: 'fence', value: 'wood' };
const grass: PaintTool = { layer: 'ground', value: 'grass' };

function isStepUpDownLeftRight(a: Square, b: Square): boolean {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;
}

/** Paints a stroke through the given finger positions, the way PaintController does. */
function stroke(zoo: Zoo, tool: PaintTool, points: Square[]): Zoo {
  let result = paintSquares(zoo, catalogue, tool, [points[0] as Square]);
  for (let i = 1; i < points.length; i++) {
    result = paintSquares(result, catalogue, tool, lineSquares(points[i - 1] as Square, points[i] as Square));
  }
  return result;
}

describe('gap-free lines', () => {
  it('goes straight along a row or column', () => {
    expect(lineSquares({ col: 2, row: 5 }, { col: 5, row: 5 })).toEqual([
      { col: 2, row: 5 },
      { col: 3, row: 5 },
      { col: 4, row: 5 },
      { col: 5, row: 5 },
    ]);
    expect(lineSquares({ col: 4, row: 4 }, { col: 4, row: 4 })).toEqual([{ col: 4, row: 4 }]);
  });

  it('never steps diagonally, even for a fast diagonal swipe', () => {
    const cases: [Square, Square][] = [
      [{ col: 2, row: 2 }, { col: 9, row: 9 }],
      [{ col: 10, row: 3 }, { col: 4, row: 7 }],
      [{ col: 5, row: 12 }, { col: 6, row: 2 }],
    ];
    for (const [a, b] of cases) {
      const line = lineSquares(a, b);
      expect(line[0]).toEqual(a);
      expect(line[line.length - 1]).toEqual(b);
      expect(line).toHaveLength(Math.abs(a.col - b.col) + Math.abs(a.row - b.row) + 1);
      for (let i = 1; i < line.length; i++) {
        expect(isStepUpDownLeftRight(line[i - 1] as Square, line[i] as Square)).toBe(true);
      }
    }
  });

  it('draws a closed ring from a few quick finger positions', () => {
    const corners = [
      { col: 5, row: 5 },
      { col: 12, row: 7 },
      { col: 10, row: 13 },
      { col: 4, row: 11 },
      { col: 5, row: 5 },
    ];
    const zoo = stroke(EMPTY_ZOO, wood, corners);
    // Every fence square touches at least two others up/down/left/right: no loose ends, no diagonal gaps.
    const fenced = Object.keys(zoo.fences).map((key) => key.split(',').map(Number) as [number, number]);
    for (const [col, row] of fenced) {
      const neighbours = [
        [col + 1, row],
        [col - 1, row],
        [col, row + 1],
        [col, row - 1],
      ].filter(([c, r]) => zoo.fences[squareKey(c as number, r as number)] !== undefined);
      expect(neighbours.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('painting ground and fences', () => {
  it('paints ground, and repaints it with another type', () => {
    let zoo = paintSquares(EMPTY_ZOO, catalogue, grass, [{ col: 3, row: 3 }]);
    expect(zoo.ground[squareKey(3, 3)]).toBe('grass');
    zoo = paintSquares(zoo, catalogue, { layer: 'ground', value: 'soil' }, [{ col: 3, row: 3 }]);
    expect(zoo.ground[squareKey(3, 3)]).toBe('soil');
  });

  it('changes a fence to a new material when painted over', () => {
    let zoo = paintSquares(EMPTY_ZOO, catalogue, wood, [{ col: 3, row: 3 }]);
    zoo = paintSquares(zoo, catalogue, { layer: 'fence', value: 'glass' }, [{ col: 3, row: 3 }]);
    expect(zoo.fences[squareKey(3, 3)]).toBe('glass');
  });

  it('erases ground or fences without touching the other layer', () => {
    let zoo = paintSquares(EMPTY_ZOO, catalogue, grass, [{ col: 3, row: 3 }]);
    zoo = paintSquares(zoo, catalogue, wood, [{ col: 3, row: 3 }]);
    const noFence = paintSquares(zoo, catalogue, { layer: 'fence', value: null }, [{ col: 3, row: 3 }]);
    expect(noFence.fences).toEqual({});
    expect(noFence.ground[squareKey(3, 3)]).toBe('grass');
    const noGround = paintSquares(zoo, catalogue, { layer: 'ground', value: null }, [{ col: 3, row: 3 }]);
    expect(noGround.ground).toEqual({});
    expect(noGround.fences[squareKey(3, 3)]).toBe('wood');
  });

  it('never paints on the visitor path or off the grid', () => {
    const zoo = stroke(EMPTY_ZOO, wood, [
      { col: 0, row: 0 },
      { col: 3, row: 0 },
    ]);
    expect(zoo).toBe(EMPTY_ZOO);
  });

  it('paints ground under items, but fences skip squares with an item', () => {
    const withPool = placeItem(EMPTY_ZOO, catalogue, 'big', 5, 5) as Zoo;
    const squares = lineSquares({ col: 4, row: 6 }, { col: 9, row: 6 });
    const fenced = paintSquares(withPool, catalogue, wood, squares);
    expect(Object.keys(fenced.fences).sort()).toEqual(['4,6', '8,6', '9,6']);
    const grassed = paintSquares(withPool, catalogue, grass, squares);
    expect(Object.keys(grassed.ground)).toHaveLength(6);
  });

  it('does not let an item be placed on a fence', () => {
    const zoo = paintSquares(EMPTY_ZOO, catalogue, wood, [{ col: 6, row: 6 }]);
    expect(canPlace(zoo, catalogue, 'big', 5, 5)).toBe(false);
    expect(canPlace(zoo, catalogue, 'small', 7, 7)).toBe(true);
  });

  it('returns the same zoo when nothing changes, so Undo gets no empty steps', () => {
    const zoo = paintSquares(EMPTY_ZOO, catalogue, grass, [{ col: 3, row: 3 }]);
    expect(paintSquares(zoo, catalogue, grass, [{ col: 3, row: 3 }])).toBe(zoo);
    expect(paintSquares(zoo, catalogue, { layer: 'ground', value: 'lava' }, [{ col: 4, row: 4 }])).toBe(zoo);
  });
});
