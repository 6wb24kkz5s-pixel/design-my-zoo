import Phaser from 'phaser';
import { FALLBACK_PAINT_STYLE, GRID, MATERIAL_STYLE, ROOF_STYLE } from '../config';
import { checkMaterial } from '../data/content';
import { parseSquareKey, type Zoo } from '../logic/zoo';
import { DEPTH } from './depth';
import { drawBlock } from './draw';

/**
 * Draws roofs as a light tint over the enclosure, in the roof material's colour and
 * pattern. A roof that keeps out fresh air also gets orange hatch lines.
 */
export class RoofLayer {
  private readonly tint: Phaser.GameObjects.Graphics;
  private readonly hatch: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.tint = scene.add.graphics().setDepth(DEPTH.roofs).setAlpha(ROOF_STYLE.tintAlpha);
    this.hatch = scene.add.graphics().setDepth(DEPTH.roofs).setAlpha(ROOF_STYLE.hatchAlpha);
  }

  render(zoo: Zoo): void {
    this.tint.clear();
    this.hatch.clear();
    const size = GRID.squareSize;
    this.hatch.lineStyle(ROOF_STYLE.hatchLineWidth, ROOF_STYLE.hatch, 1);

    for (const [key, material] of Object.entries(zoo.roofs)) {
      const square = parseSquareKey(key);
      if (!square) continue;
      const x = square.col * size;
      const y = square.row * size;
      drawBlock(this.tint, x, y, size, size, MATERIAL_STYLE[material] ?? FALLBACK_PAINT_STYLE);

      if (!checkMaterial('roof', material).works) {
        // Five "/" lines across the square: three from the left edge and two from the bottom edge.
        for (const k of [1 / 3, 2 / 3, 1]) this.hatch.lineBetween(x, y + size * k, x + size * k, y);
        for (const k of [1 / 3, 2 / 3]) this.hatch.lineBetween(x + size * k, y + size, x + size, y + size * k);
      }
    }
  }
}
