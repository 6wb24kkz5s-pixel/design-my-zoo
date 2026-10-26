import Phaser from 'phaser';
import { art } from './index';
import { spriteName } from './names';

/** The key of the picture atlas in Phaser's texture manager. */
export const ART_KEY = 'art';

/**
 * Hands the pictures to Phaser: one atlas texture with a named frame for every sprite, plus two
 * small textures that repeat across the plot (the building area and the visitor path).
 */
export function registerArt(textures: Phaser.Textures.TextureManager): void {
  if (textures.exists(ART_KEY)) return;
  const pictures = art();

  const atlas = textures.addCanvas(ART_KEY, pictures.canvas);
  if (!atlas) throw new Error('Phaser could not use the pictures');
  // Crisp, never blurred.
  atlas.setFilter(Phaser.Textures.FilterMode.NEAREST);
  for (const frame of pictures.frames.values()) atlas.add(frame.name, 0, frame.x, frame.y, frame.width, frame.height);

  for (const tile of [spriteName.plot, spriteName.path]) {
    textures.addCanvas(tile, pictures.frameCanvas(tile))?.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
}
