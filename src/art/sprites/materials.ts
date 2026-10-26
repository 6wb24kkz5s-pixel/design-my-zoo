import { materialLook, type MaterialLook } from '../palette';
import { Pixels, seededRandom } from '../pixels';
import type { Drawing } from './ground';

/**
 * Fills a rectangle with a material: its middle colour, then its pattern (planks, wire mesh,
 * dots…). Sprites use the letters L, M, D and P, which are filled in with the material's colours.
 */
export function fillTexture(px: Pixels, x: number, y: number, w: number, h: number, look: MaterialLook): void {
  px.rect(x, y, w, h, 'M');
  switch (look.pattern) {
    case 'planks':
      for (let row = 0, yy = y + 3; yy < y + h; yy += 4, row++) {
        px.rect(x, yy, w, 1, 'D');
        // Staggered joins between planks.
        px.rect(x + ((row * 5 + 3) % Math.max(w - 1, 1)), yy - 3, 1, 3, 'D');
      }
      break;
    case 'mesh':
      for (let xx = x + 2; xx < x + w; xx += 4) px.rect(xx, y, 1, h, 'P');
      for (let yy = y + 2; yy < y + h; yy += 4) px.rect(x, yy, w, 1, 'P');
      break;
    case 'dots': {
      const random = seededRandom(31 + w * 7 + h);
      for (let i = 0; i < Math.max(4, Math.floor((w * h) / 9)); i++) {
        px.set(x + Math.floor(random() * w), y + Math.floor(random() * h), random() < 0.7 ? 'D' : 'L');
      }
      break;
    }
    case 'stripes':
      for (let xx = x + 1; xx < x + w; xx += 4) px.rect(xx, y, 1, h, 'D');
      break;
    case 'shine':
      for (let k = 0; k < Math.floor((w + h) / 9); k++) {
        px.line(x + 2 + k * 6, y + h - 2, x + 2 + k * 6 + 4, y + h - 6, 'L');
        px.line(x + 3 + k * 6, y + h - 2, x + 3 + k * 6 + 4, y + h - 6, 'L');
      }
      break;
    case 'leaves':
    case 'bigDots':
    case 'none':
      break;
  }
  // A light edge on top and a dark edge underneath, so it looks like a block.
  px.rect(x, y, w, 1, 'L');
  px.rect(x, y + h - 1, w, 1, 'D');
}

/** A 16×16 fence block: a dark outline round the material. A weak fence (not strong) is cracked and chipped. */
export function fenceTile(materialId: string, weak: boolean): Drawing {
  const look = materialLook(materialId);
  const px = new Pixels(16, 16);
  px.rect(0, 0, 16, 16, 'k');
  fillTexture(px, 1, 1, 14, 14, look);
  if (weak) {
    px.line(6, 1, 8, 5, 'k').line(8, 5, 6, 9, 'k').line(6, 9, 9, 14, 'k');
    px.rect(12, 0, 4, 3, '.').rect(0, 13, 3, 3, '.');
    px.set(11, 3, 'k').set(2, 12, 'k');
  }
  return { pixels: px, palette: look.palette };
}

/** A 16×16 roof tile, drawn faintly over an enclosure. */
export function roofTile(materialId: string): Drawing {
  const look = materialLook(materialId);
  const px = new Pixels(16, 16);
  fillTexture(px, 0, 0, 16, 16, look);
  return { pixels: px, palette: look.palette };
}

/** The orange hatch lines drawn over a roof that keeps out fresh air. */
export function roofHatch(): Drawing {
  const px = new Pixels(16, 16);
  for (const k of [3, 8, 13]) {
    px.line(0, k, k, 0, 'H');
    px.line(15 - k + 1, 15, 15, 15 - k + 1, 'H');
  }
  px.line(0, 15, 15, 0, 'H');
  return { pixels: px, palette: { H: '#ff9f1c' } };
}

/** A small picture of a material, for the material cards. */
export function materialSwatch(materialId: string): Drawing {
  return fenceTile(materialId, false);
}
