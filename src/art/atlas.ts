// Turns the sprite drawings into pictures the browser can show: one big atlas image that Phaser
// uses, and small separate pictures for the buttons and panels. Nothing is downloaded.

import { buildSprites, type SpriteDef } from './catalogue';
import { colourOf } from './palette';

/** Each sprite pixel becomes this many screen-canvas pixels: 16 art pixels = one 48-pixel grid square. */
export const ART_SCALE = 3;

/** Empty space between pictures in the atlas, so neighbours never leak into each other. */
const PADDING = 2;
const ATLAS_WIDTH = 1024;

export interface ArtFrame {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Art {
  canvas: HTMLCanvasElement;
  frames: ReadonlyMap<string, ArtFrame>;
  /** A picture as a data: address, for use in buttons and panels. Made once, then remembered. */
  url(name: string): string;
  /** A picture as its own canvas. */
  frameCanvas(name: string): HTMLCanvasElement;
}

function drawSprite(ctx: CanvasRenderingContext2D, sprite: SpriteDef, ox: number, oy: number): void {
  for (let y = 0; y < sprite.pixels.height; y++) {
    for (let x = 0; x < sprite.pixels.width; x++) {
      const colour = colourOf(sprite.pixels.get(x, y), sprite.palette);
      if (colour === null) continue;
      ctx.fillStyle = colour;
      ctx.fillRect(ox + x * ART_SCALE, oy + y * ART_SCALE, ART_SCALE, ART_SCALE);
    }
  }
}

/** Draws every sprite into one atlas, packed in rows. */
export function bakeArt(sprites: readonly SpriteDef[] = buildSprites()): Art {
  const sizes = sprites.map((sprite) => ({
    sprite,
    width: sprite.pixels.width * ART_SCALE,
    height: sprite.pixels.height * ART_SCALE,
  }));
  // Tallest first, so each row wastes little space.
  sizes.sort((a, b) => b.height - a.height);

  const placed: { sprite: SpriteDef; x: number; y: number; width: number; height: number }[] = [];
  let x = PADDING;
  let y = PADDING;
  let rowHeight = 0;
  for (const size of sizes) {
    if (x + size.width + PADDING > ATLAS_WIDTH) {
      x = PADDING;
      y += rowHeight + PADDING;
      rowHeight = 0;
    }
    placed.push({ ...size, x, y });
    x += size.width + PADDING;
    rowHeight = Math.max(rowHeight, size.height);
  }

  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_WIDTH;
  canvas.height = y + rowHeight + PADDING;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot draw the pictures');

  const frames = new Map<string, ArtFrame>();
  for (const p of placed) {
    drawSprite(ctx, p.sprite, p.x, p.y);
    frames.set(p.sprite.name, { name: p.sprite.name, x: p.x, y: p.y, width: p.width, height: p.height });
  }

  const urls = new Map<string, string>();
  const frameCanvas = (name: string): HTMLCanvasElement => {
    const frame = frames.get(name);
    if (!frame) throw new Error(`no picture called "${name}"`);
    const piece = document.createElement('canvas');
    piece.width = frame.width;
    piece.height = frame.height;
    piece.getContext('2d')?.drawImage(canvas, frame.x, frame.y, frame.width, frame.height, 0, 0, frame.width, frame.height);
    return piece;
  };
  const url = (name: string): string => {
    let cached = urls.get(name);
    if (cached === undefined) {
      cached = frameCanvas(name).toDataURL('image/png');
      urls.set(name, cached);
    }
    return cached;
  };

  return { canvas, frames, url, frameCanvas };
}
