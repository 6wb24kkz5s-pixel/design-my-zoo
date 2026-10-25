import Phaser from 'phaser';
import { FALLBACK_PAINT_STYLE, FENCE_DRAW, GRID, GROUND_STYLE, MATERIAL_STYLE } from '../config';
import { checkMaterial } from '../data/content';
import { parseSquareKey, type SquareMap, type Zoo } from '../logic/zoo';
import { DEPTH } from './depth';
import { dashedRect, drawBlock } from './draw';

/**
 * Draws painted ground (under the grid lines) and fences (over them) with
 * placeholder colours and patterns. A fence that is not strong has a dashed outline.
 */
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
      drawBlock(this.ground, col * size, row * size, size, size, GROUND_STYLE[id] ?? FALLBACK_PAINT_STYLE);
    });

    this.fences.clear();
    forEachSquare(zoo.fences, (col, row, material) => {
      const inset = FENCE_DRAW.inset;
      const size = GRID.squareSize - inset * 2;
      const x = col * GRID.squareSize + inset;
      const y = row * GRID.squareSize + inset;
      drawBlock(this.fences, x, y, size, size, MATERIAL_STYLE[material] ?? FALLBACK_PAINT_STYLE);
      this.fences.lineStyle(FENCE_DRAW.borderWidth, FENCE_DRAW.border, 1);
      if (checkMaterial('fence', material).works) {
        this.fences.strokeRect(x, y, size, size);
      } else {
        dashedRect(this.fences, x, y, size, size, FENCE_DRAW.weakDash, FENCE_DRAW.weakGap);
      }
    });
  }
}

function forEachSquare(map: SquareMap, draw: (col: number, row: number, value: string) => void): void {
  for (const [key, value] of Object.entries(map)) {
    const square = parseSquareKey(key);
    if (square) draw(square.col, square.row, value);
  }
}
