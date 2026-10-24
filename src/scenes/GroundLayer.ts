import Phaser from 'phaser';
import { FALLBACK_PAINT_STYLE, FENCE_DRAW, GRID, GROUND_STYLE, MATERIAL_STYLE, type PaintStyle } from '../config';
import { parseSquareKey, type SquareMap, type Zoo } from '../logic/zoo';
import { DEPTH } from './depth';

/** Draws painted ground (under the grid lines) and fences (over them) with placeholder colours and patterns. */
export class GroundLayer {
  private readonly ground: Phaser.GameObjects.Graphics;
  private readonly fences: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.ground = scene.add.graphics().setDepth(DEPTH.ground);
    this.fences = scene.add.graphics().setDepth(DEPTH.fences);
  }

  render(zoo: Zoo): void {
    this.ground.clear();
    forEachSquare(zoo.ground, (col, row, id) => {
      const size = GRID.squareSize;
      drawBlock(this.ground, col * size, row * size, size, GROUND_STYLE[id] ?? FALLBACK_PAINT_STYLE);
    });

    this.fences.clear();
    forEachSquare(zoo.fences, (col, row, material) => {
      const inset = FENCE_DRAW.inset;
      const size = GRID.squareSize - inset * 2;
      const x = col * GRID.squareSize + inset;
      const y = row * GRID.squareSize + inset;
      drawBlock(this.fences, x, y, size, MATERIAL_STYLE[material] ?? FALLBACK_PAINT_STYLE);
      this.fences.lineStyle(FENCE_DRAW.borderWidth, FENCE_DRAW.border, 1);
      this.fences.strokeRect(x, y, size, size);
    });
  }
}

function forEachSquare(map: SquareMap, draw: (col: number, row: number, value: string) => void): void {
  for (const [key, value] of Object.entries(map)) {
    const square = parseSquareKey(key);
    if (square) draw(square.col, square.row, value);
  }
}

/** A filled square with its placeholder pattern on top. */
function drawBlock(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, style: PaintStyle): void {
  g.fillStyle(style.colour, 1);
  g.fillRect(x, y, size, size);

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
