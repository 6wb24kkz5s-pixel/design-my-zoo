// Painting ground and fences, one finger stroke at a time.

import { insideBuildingArea, itemAt, squareKey, type Catalogue, type Square, type Zoo } from './zoo';

/** What one finger paints. `value` is a ground id or fence material; null means erase. */
export interface PaintTool {
  layer: 'ground' | 'fence';
  value: string | null;
}

/**
 * Every square on the way from `a` to `b`, stepping only up, down, left or
 * right. A fast diagonal swipe still gives an unbroken line, so a fence drawn
 * this way never has a diagonal gap (GDD section 10).
 */
export function lineSquares(a: Square, b: Square): Square[] {
  const dx = Math.abs(b.col - a.col);
  const dy = Math.abs(b.row - a.row);
  const stepCol = Math.sign(b.col - a.col);
  const stepRow = Math.sign(b.row - a.row);
  const squares: Square[] = [{ col: a.col, row: a.row }];

  let { col, row } = a;
  let error = dx - dy;
  while (col !== b.col || row !== b.row) {
    if (2 * error > -dy) {
      error -= dy;
      col += stepCol;
    } else {
      error += dx;
      row += stepRow;
    }
    squares.push({ col, row });
  }
  return squares;
}

/**
 * Paints (or erases) the given squares. Only building-area squares change.
 * Fences skip squares under an item. Returns the same zoo if nothing changed.
 */
export function paintSquares(zoo: Zoo, catalogue: Catalogue, tool: PaintTool, squares: readonly Square[]): Zoo {
  const layerName = tool.layer === 'ground' ? 'ground' : 'fences';
  const valid =
    tool.value === null ||
    (tool.layer === 'ground' ? catalogue.isGround(tool.value) : catalogue.isFenceMaterial(tool.value));
  if (!valid) return zoo;

  const layer = { ...zoo[layerName] };
  let changed = false;
  for (const { col, row } of squares) {
    if (!insideBuildingArea({ col, row, width: 1, height: 1 })) continue;
    if (tool.layer === 'fence' && tool.value !== null && itemAt(zoo, catalogue, col, row)) continue;

    const key = squareKey(col, row);
    if (tool.value === null) {
      if (key in layer) {
        delete layer[key];
        changed = true;
      }
    } else if (layer[key] !== tool.value) {
      layer[key] = tool.value;
      changed = true;
    }
  }
  if (!changed) return zoo;
  return tool.layer === 'ground' ? { ...zoo, ground: layer } : { ...zoo, fences: layer };
}
