import Phaser from 'phaser';
import { FENCE_DRAW, GRID, type PaintStyle } from '../config';

/**
 * A filled rectangle with its placeholder pattern on top. The pattern repeats
 * once per grid square, so a big block (a 3×3 pool) looks like three by three of them.
 */
export function drawBlock(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  style: PaintStyle,
): void {
  g.fillStyle(style.colour, 1);
  g.fillRect(x, y, width, height);

  const tile = GRID.squareSize;
  for (let dx = 0; dx < width - 1; dx += tile) {
    for (let dy = 0; dy < height - 1; dy += tile) {
      drawPattern(g, x + dx, y + dy, Math.min(tile, width - dx, height - dy), style);
    }
  }
}

/** The pattern for one square-shaped cell whose top-left corner is (x, y). */
function drawPattern(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, style: PaintStyle): void {
  const q = size / 4;
  g.fillStyle(style.patternColour, 1);
  g.lineStyle(FENCE_DRAW.patternLineWidth, style.patternColour, 1);

  switch (style.pattern) {
    case 'dots':
      for (const [dx, dy] of [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]] as const) {
        g.fillCircle(x + dx * q, y + dy * q, size / 24);
      }
      break;
    case 'bigDots':
      for (const [dx, dy] of [[1.2, 1.2], [2.9, 1.6], [1.7, 2.9]] as const) {
        g.fillCircle(x + dx * q, y + dy * q, size / 9);
      }
      break;
    case 'leaves':
      for (const [dx, dy] of [[1, 1.2], [2.8, 1], [2, 2.4], [1, 3.1], [3, 3]] as const) {
        g.fillEllipse(x + dx * q, y + dy * q, size / 6, size / 12);
      }
      break;
    case 'stripes':
      for (let i = 1; i < 4; i++) g.lineBetween(x + i * q, y + q / 2, x + i * q, y + size - q / 2);
      break;
    case 'planks':
      for (let i = 1; i < 3; i++) g.lineBetween(x, y + (i * size) / 3, x + size, y + (i * size) / 3);
      break;
    case 'mesh':
      for (let i = 1; i < 4; i++) {
        g.lineBetween(x + i * q, y, x + i * q, y + size);
        g.lineBetween(x, y + i * q, x + size, y + i * q);
      }
      break;
    case 'shine':
      g.lineBetween(x + q, y + 2 * q, x + 2 * q, y + q);
      g.lineBetween(x + 1.5 * q, y + 3 * q, x + 3 * q, y + 1.5 * q);
      break;
    case 'none':
      break;
  }
}

/** A dashed rectangle outline, using the Graphics object's current line style. */
export function dashedRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  dash: number,
  gap: number,
): void {
  dashedLine(g, x, y, x + width, y, dash, gap);
  dashedLine(g, x + width, y, x + width, y + height, dash, gap);
  dashedLine(g, x + width, y + height, x, y + height, dash, gap);
  dashedLine(g, x, y + height, x, y, dash, gap);
}

function dashedLine(
  g: Phaser.GameObjects.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash: number,
  gap: number,
): void {
  const length = Math.hypot(x2 - x1, y2 - y1);
  for (let d = 0; d < length; d += dash + gap) {
    const end = Math.min(d + dash, length);
    g.lineBetween(
      x1 + ((x2 - x1) * d) / length,
      y1 + ((y2 - y1) * d) / length,
      x1 + ((x2 - x1) * end) / length,
      y1 + ((y2 - y1) * end) / length,
    );
  }
}
