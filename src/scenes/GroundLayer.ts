import Phaser from 'phaser';
import { GROUND_VARIANTS, spriteName } from '../art/names';
import { ART_KEY } from '../art/phaser';
import { GRID } from '../config';
import { checkMaterial } from '../data/content';
import { parseSquareKey, type SquareMap, type Zoo } from '../logic/zoo';
import { DEPTH } from './depth';

type Pool = Map<string, Phaser.GameObjects.Image>;

/**
 * Draws painted ground (under the grid lines) and fences (over them) from the pictures. A fence that is
 * not strong is cracked and chipped. Only squares that changed are touched, so painting stays smooth.
 */
export class GroundLayer {
  private readonly ground: Pool = new Map();
  private readonly fences: Pool = new Map();

  constructor(private readonly scene: Phaser.Scene) {}

  render(zoo: Zoo): void {
    this.sync(this.ground, zoo.ground, DEPTH.ground, (col, row, id) => spriteName.ground(id, variantFor(col, row)));
    this.sync(this.fences, zoo.fences, DEPTH.fences, (_col, _row, material) =>
      spriteName.fence(material, !checkMaterial('fence', material).works),
    );
  }

  /** Makes the pictures in `pool` match the squares in `wanted`. */
  private sync(
    pool: Pool,
    wanted: SquareMap,
    depth: number,
    frameFor: (col: number, row: number, value: string) => string,
  ): void {
    for (const [key, value] of Object.entries(wanted)) {
      const square = parseSquareKey(key);
      if (!square) continue;
      const frame = frameFor(square.col, square.row, value);
      const existing = pool.get(key);
      if (existing) {
        if (existing.frame.name !== frame) existing.setFrame(frame);
      } else {
        const image = this.scene.add
          .image(square.col * GRID.squareSize, square.row * GRID.squareSize, ART_KEY, frame)
          .setOrigin(0)
          .setDepth(depth);
        pool.set(key, image);
      }
    }
    for (const [key, image] of pool) {
      if (key in wanted) continue;
      image.destroy();
      pool.delete(key);
    }
  }
}

/** Which of the ground variations a square gets: always the same for the same square. */
function variantFor(col: number, row: number): number {
  return (col * 7 + row * 13 + col * row) % GROUND_VARIANTS;
}
