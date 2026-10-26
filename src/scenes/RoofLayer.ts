import Phaser from 'phaser';
import { spriteName } from '../art/names';
import { ART_KEY } from '../art/phaser';
import { GRID, ROOF_STYLE } from '../config';
import { checkMaterial } from '../data/content';
import { parseSquareKey, type Zoo } from '../logic/zoo';
import { DEPTH } from './depth';

interface RoofSquare {
  tint: Phaser.GameObjects.Image;
  hatch: Phaser.GameObjects.Image | null;
  material: string;
}

/**
 * Draws roofs as a light tint over the enclosure, in the roof material's colour and pattern.
 * A roof that keeps out fresh air also gets orange hatch lines.
 */
export class RoofLayer {
  private readonly squares = new Map<string, RoofSquare>();

  constructor(private readonly scene: Phaser.Scene) {}

  render(zoo: Zoo): void {
    for (const [key, material] of Object.entries(zoo.roofs)) {
      const square = parseSquareKey(key);
      if (!square) continue;
      const existing = this.squares.get(key);
      if (existing?.material === material) continue;
      existing?.tint.destroy();
      existing?.hatch?.destroy();

      const x = square.col * GRID.squareSize;
      const y = square.row * GRID.squareSize;
      const tint = this.scene.add
        .image(x, y, ART_KEY, spriteName.roof(material))
        .setOrigin(0)
        .setDepth(DEPTH.roofs)
        .setAlpha(ROOF_STYLE.tintAlpha);
      const blocksAir = !checkMaterial('roof', material).works;
      const hatch = blocksAir
        ? this.scene.add
            .image(x, y, ART_KEY, spriteName.roofHatch)
            .setOrigin(0)
            .setDepth(DEPTH.roofs)
            .setAlpha(ROOF_STYLE.hatchAlpha)
        : null;
      this.squares.set(key, { tint, hatch, material });
    }

    for (const [key, square] of this.squares) {
      if (key in zoo.roofs) continue;
      square.tint.destroy();
      square.hatch?.destroy();
      this.squares.delete(key);
    }
  }
}
