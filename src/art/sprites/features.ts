import { materialLook, type MaterialLook } from '../palette';
import { Pixels, seededRandom } from '../pixels';
import type { Drawing } from './ground';
import { fillTexture } from './materials';

/** How far in from the edge the water starts, in sprite pixels, for pools, ponds and bowls. */
export const WATER_INSET = 4;

const own = (px: Pixels, look: MaterialLook): Drawing => ({ pixels: px, palette: look.palette });

// ---- Pools, ponds and bowls -------------------------------------------------------------------

/**
 * A pool, pond or bowl with no water in it: a rim made of the material round a dry floor. The water
 * and the cracks are separate pictures that sit on top, so the water can drain away when the
 * material is not waterproof.
 */
export function waterHolderBase(squaresWide: number, squaresHigh: number, materialId: string): Drawing {
  const look = materialLook(materialId);
  const w = squaresWide * 16;
  const h = squaresHigh * 16;
  const px = new Pixels(w, h);

  if (squaresWide === 1 && squaresHigh === 1) {
    // A round bowl.
    const texture = new Pixels(16, 16);
    fillTexture(texture, 0, 0, 16, 16, look);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const dx = (x + 0.5 - 8) / 7.5;
        const dy = (y + 0.5 - 8) / 7.5;
        if (dx * dx + dy * dy <= 1) px.set(x, y, texture.get(x, y));
      }
    }
    px.outline('k');
    px.ellipse(8, 8, 4.6, 4.6, 'F').ellipse(8, 8, 3.9, 3.9, 'f');
    return own(px, look);
  }

  px.rect(0, 0, w, h, 'k');
  fillTexture(px, 1, 1, w - 2, h - 2, look);
  // The floor, with a dark line where the rim meets it.
  px.rect(WATER_INSET - 1, WATER_INSET - 1, w - (WATER_INSET - 1) * 2, h - (WATER_INSET - 1) * 2, 'k');
  px.rect(WATER_INSET, WATER_INSET, w - WATER_INSET * 2, h - WATER_INSET * 2, 'f');
  // Round the outside corners.
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]] as const) px.set(x, y, '.');
  return own(px, look);
}

/** The water that fills a pool, pond or bowl, drawn on top of its floor. */
export function waterFill(squaresWide: number, squaresHigh: number): Drawing {
  const iw = squaresWide * 16 - WATER_INSET * 2;
  const ih = squaresHigh * 16 - WATER_INSET * 2;
  const px = new Pixels(iw, ih);
  const round = squaresWide === 1 && squaresHigh === 1;
  if (round) {
    px.ellipse(iw / 2, ih / 2, iw / 2, ih / 2, 'u');
  } else {
    px.rect(0, 0, iw, ih, 'u');
    px.rect(0, ih - 1, iw, 1, 'U').rect(iw - 1, 0, 1, ih, 'U');
  }
  const random = seededRandom(900 + iw * 3 + ih);
  const dashes = Math.max(3, Math.floor((iw * ih) / 38));
  for (let i = 0; i < dashes; i++) {
    const x = 1 + Math.floor(random() * (iw - 4));
    const y = 1 + Math.floor(random() * (ih - 2));
    if (px.get(x, y) !== '.' && px.get(x + 2, y) !== '.') px.line(x, y, x + 2, y, 'v');
  }
  return { pixels: px, palette: {} };
}

/** Cracks in a dry floor, drawn on top once the water has gone. */
export function waterCracks(squaresWide: number, squaresHigh: number): Drawing {
  const iw = squaresWide * 16 - WATER_INSET * 2;
  const ih = squaresHigh * 16 - WATER_INSET * 2;
  const px = new Pixels(iw, ih);
  const random = seededRandom(55 + iw + ih * 5);
  const cracks = Math.max(1, Math.floor((iw * ih) / 220));
  for (let i = 0; i < cracks; i++) {
    let x = 2 + random() * (iw - 4);
    let y = 1 + random() * (ih - 3);
    for (let step = 0; step < 4; step++) {
      const nx = x + (random() - 0.3) * 4;
      const ny = y + (random() - 0.2) * 3;
      px.line(x, y, nx, ny, 'F');
      x = Math.min(Math.max(nx, 1), iw - 2);
      y = Math.min(Math.max(ny, 1), ih - 2);
    }
  }
  return { pixels: px, palette: {} };
}

/** Two rings on the water, shown when something sinks. */
export function ripple(): Drawing {
  const px = new Pixels(16, 16);
  px.ellipse(8, 8, 7.6, 6.2, 'v').ellipse(8, 8, 6.2, 4.8, '.');
  px.ellipse(8, 8, 4.2, 3.2, 'v').ellipse(8, 8, 3, 2.1, '.');
  return { pixels: px, palette: {} };
}

// ---- Island, hut, shade cover, swing ------------------------------------------------------------

/** A floating island: a little raft made of the material. */
export function islandSprite(materialId: string): Drawing {
  const look = materialLook(materialId);
  const px = new Pixels(16, 16);
  px.rect(1, 3, 14, 11, 'k');
  fillTexture(px, 2, 4, 12, 9, look);
  px.rect(2, 12, 12, 1, 'D');
  for (const [x, y] of [[1, 3], [14, 3], [1, 13], [14, 13]] as const) px.set(x, y, '.');
  // Ropes tying it together.
  px.rect(5, 4, 1, 9, 'D').rect(10, 4, 1, 9, 'D');
  return own(px, look);
}

/** A hut with walls and a pitched roof, in the chosen material. */
export function hutSprite(materialId: string): Drawing {
  const look = materialLook(materialId);
  const px = new Pixels(32, 32);
  fillTexture(px, 5, 16, 22, 13, look);
  px.rect(13, 21, 6, 8, 'k').rect(14, 22, 4, 7, 'D');
  px.triangle(16, 3, 2, 17.5, 30, 17.5, 'D');
  for (const y of [7, 10, 13]) px.line(16 - (y - 3) * 0.9, y, 16 + (y - 3) * 0.9, y, 'M');
  px.line(16, 3, 3, 16, 'L').line(16, 3, 16, 16, 'D');
  px.outline('k');
  return own(px, look);
}

/** What is left of a hut that was not strong enough: a heap of its own material. */
export function rubbleSprite(materialId: string): Drawing {
  const look = materialLook(materialId);
  const px = new Pixels(32, 32);
  const plank = (x0: number, y0: number, x1: number, y1: number) => {
    px.line(x0, y0, x1, y1, 'M').line(x0, y0 + 1, x1, y1 + 1, 'M').line(x0, y0 + 2, x1, y1 + 2, 'D');
  };
  plank(4, 25, 17, 20);
  plank(14, 22, 28, 27);
  plank(6, 28, 22, 24);
  plank(18, 19, 25, 23);
  px.rect(10, 26, 4, 3, 'M').rect(21, 25, 3, 4, 'D');
  px.outline('k');
  return own(px, look);
}

/** A shade cover: a canopy of the chosen material on four posts. */
export function shadeSprite(materialId: string): Drawing {
  const look = materialLook(materialId);
  const px = new Pixels(32, 32);
  // Posts at the back and the front.
  px.rect(4, 14, 2, 14, 't').rect(26, 14, 2, 14, 't').rect(3, 20, 2, 9, 'k').rect(27, 20, 2, 9, 'k');
  fillTexture(px, 2, 5, 28, 14, look);
  // A scalloped edge along the front.
  for (let i = 0; i < 7; i++) px.ellipse(4 + i * 4, 19, 2, 2, 'M').ellipse(4 + i * 4, 20, 2, 1, 'D');
  px.rect(2, 18, 28, 1, 'D');
  px.outline('k');
  return own(px, look);
}

/** The shadow a shade cover makes on the ground. */
export function shadowSprite(): Drawing {
  const px = new Pixels(32, 32);
  px.ellipse(16, 24, 14.5, 6.5, 'z');
  return { pixels: px, palette: {} };
}

/** Sunlight pouring through a shade cover that is transparent. */
export function sunSprite(): Drawing {
  const px = new Pixels(32, 32);
  px.rect(2, 5, 28, 15, 'x');
  for (let k = 0; k < 6; k++) {
    px.line(4 + k * 5, 4, 1 + k * 5, 28, 'X').line(5 + k * 5, 4, 2 + k * 5, 28, 'X');
  }
  px.line(0, 0, 4, 0, 'X');
  return { pixels: px, palette: {} };
}

/** A swing: an A-frame, two ropes and a seat made of the chosen material. */
export function swingSprite(materialId: string, broken: boolean): Drawing {
  const look = materialLook(materialId);
  const px = new Pixels(16, 16);
  px.line(2, 14, 4, 1, 'k').line(13, 14, 11, 1, 'k').rect(3, 1, 10, 2, 'k');
  if (!broken) {
    px.rect(5, 3, 1, 8, 'k').rect(10, 3, 1, 8, 'k');
    px.rect(3, 10, 10, 4, 'k');
    fillTexture(px, 4, 11, 8, 2, look);
  } else {
    // One rope snapped; the seat has dropped and tipped over.
    px.rect(10, 3, 1, 5, 'k').rect(5, 3, 1, 3, 'k');
    px.line(2, 14, 12, 12, 'k').line(2, 15, 12, 13, 'k');
    fillTexture(px, 3, 13, 9, 2, look);
    px.set(10, 8, 'k').set(11, 9, 'k');
  }
  return own(px, look);
}

// ---- Plants, shelter and the rest ---------------------------------------------------------------

export function tallTree(): Drawing {
  const px = new Pixels(16, 16);
  px.rect(7, 9, 3, 6, 'n').rect(9, 9, 1, 6, 'N');
  px.ellipse(8, 6.5, 6.5, 5.5, 'g');
  px.ellipse(9.5, 8, 5, 3.6, 'G');
  px.ellipse(6.6, 5.2, 4.8, 3.4, 'g');
  px.ellipse(5.2, 3.8, 1.8, 1, 'j');
  px.set(9, 7, 'h').set(11, 5, 'h').set(5, 8, 'h');
  px.outline('k');
  return { pixels: px, palette: {} };
}

export function bushes(): Drawing {
  const px = new Pixels(16, 16);
  px.ellipse(5, 10.5, 4.2, 3.8, 'g').ellipse(11, 10.5, 4.2, 3.8, 'g').ellipse(8, 7.5, 4.8, 4.2, 'g');
  px.ellipse(9, 11.5, 6, 2.4, 'G');
  px.ellipse(6.5, 6, 2.6, 1.6, 'j');
  for (const [x, y] of [[6, 8], [10, 9], [8, 5], [4, 11], [12, 11]] as const) px.set(x, y, 'r');
  px.outline('k');
  return { pixels: px, palette: {} };
}

export function hollowLog(): Drawing {
  const px = new Pixels(32, 16);
  px.rect(3, 3, 24, 10, 'n').ellipse(3.5, 8, 3, 5, 'n');
  for (const [x, y, w] of [[5, 5, 12], [10, 8, 14], [6, 11, 10], [17, 5, 6]] as const) px.rect(x, y, w, 1, 'N');
  px.rect(4, 3, 22, 1, 'd');
  px.ellipse(27, 8, 3.6, 5, 'o').ellipse(27, 8, 2.4, 3.8, 'N').ellipse(27.4, 8, 1.6, 3, 'k');
  px.outline('k');
  return { pixels: px, palette: {} };
}

export function rockCave(): Drawing {
  const px = new Pixels(32, 32);
  px.ellipse(16, 21, 15, 11, 'i');
  px.rect(0, 29, 32, 3, '.');
  px.ellipse(7, 22, 6, 5.5, 'i').ellipse(25, 22, 6, 5.5, 'i').ellipse(16, 13, 8, 6, 'i');
  // The dark mouth of the cave.
  px.ellipse(16, 25, 5.4, 6, 'k').rect(10.6, 25, 10.8, 4, 'k');
  px.ellipse(16, 26, 3.6, 4, 't');
  // Shading and highlights on the boulders.
  for (const [x, y, w] of [[4, 25, 5], [22, 26, 6], [12, 17, 8], [8, 14, 4]] as const) px.rect(x, y, w, 1, 'I');
  for (const [x, y] of [[6, 19], [24, 19], [13, 9], [17, 10]] as const) px.rect(x, y, 3, 1, 'w');
  px.outline('k');
  return { pixels: px, palette: {} };
}

export function waterPlants(): Drawing {
  const px = new Pixels(16, 16);
  px.ellipse(5, 9.5, 4.2, 2.8, 'g').ellipse(11, 6, 3.6, 2.4, 'g').ellipse(10.5, 12, 3.2, 2.1, 'G');
  px.line(5, 9, 9, 9, '.').line(11, 6, 14, 5, '.');
  px.ellipse(9.5, 5.4, 1.7, 1.7, 'p').set(9, 5, 'y').set(10, 5, 'y');
  px.outline('G');
  return { pixels: px, palette: {} };
}

export function mistSprayer(): Drawing {
  const px = new Pixels(16, 16);
  px.rect(7, 7, 2, 9, 't').rect(5, 4, 6, 4, 'I').rect(11, 5, 2, 2, 't').rect(5, 4, 6, 1, 's');
  for (const [x, y] of [[14, 4], [15, 6], [13, 2], [15, 2], [3, 2], [1, 4], [4, 0], [2, 7], [12, 8]] as const) px.set(x, y, 'v');
  px.outline('k');
  return { pixels: px, palette: {} };
}

// ---- Food ---------------------------------------------------------------------------------------

export function fishFood(): Drawing {
  const px = new Pixels(16, 16);
  px.rect(4, 6, 8, 8, 'r').rect(4, 4, 8, 3, 'I').rect(5, 3, 6, 1, 's').rect(4, 9, 8, 3, 'w');
  px.ellipse(7, 10.5, 2, 1, 'a').triangle(9, 10.5, 11, 9.5, 11, 11.5, 'a').set(6, 10, 'k');
  px.outline('k');
  for (const [x, y, c] of [[2, 13, 'a'], [13, 14, 'y'], [14, 11, 'r'], [1, 10, 'y']] as const) px.set(x, y, c);
  return { pixels: px, palette: {} };
}

export function insects(): Drawing {
  const px = new Pixels(16, 16);
  const bug = (x: number, y: number) => {
    px.ellipse(x, y, 1.9, 2.5, 'N').set(x - 1, y - 1, 'n');
    px.line(x - 3, y - 2, x - 2, y - 1, 'k').line(x + 2, y - 1, x + 3, y - 2, 'k');
    px.line(x - 3, y + 2, x - 2, y + 1, 'k').line(x + 2, y + 1, x + 3, y + 2, 'k');
  };
  bug(4.5, 4.5);
  bug(11.5, 6.5);
  bug(6.5, 11.5);
  return { pixels: px, palette: {} };
}

export function seedsFruit(): Drawing {
  const px = new Pixels(16, 16);
  px.ellipse(6.5, 9, 4.8, 4.6, 'r').ellipse(5, 7.5, 1.4, 1.1, 'p');
  px.rect(6, 3, 1, 2, 'N').ellipse(9.2, 3.8, 2.2, 1.2, 'g');
  for (const [x, y] of [[12.5, 12], [13.5, 9.5], [11, 14], [14, 13.5]] as const) px.ellipse(x, y, 1.2, 0.8, 'd');
  px.outline('k');
  return { pixels: px, palette: {} };
}

export function shrimp(): Drawing {
  const px = new Pixels(16, 16);
  px.ellipse(5, 5.5, 2.8, 2.4, 'p').ellipse(9.5, 4.6, 2.6, 2.2, 'p').ellipse(12, 8.2, 2.2, 2.6, 'p').ellipse(10, 11.5, 2.4, 2, 'P');
  px.triangle(7, 13, 4, 12, 5, 15, 'P').triangle(7, 13, 8, 15.5, 5, 15, 'P');
  px.set(4, 5, 'k').line(2, 3, 0, 1, 'P').line(3, 3, 2, 0, 'P');
  for (const [x, y] of [[8, 4], [12, 7], [10, 11]] as const) px.set(x, y, 'P');
  px.outline('k');
  return { pixels: px, palette: {} };
}

export function meat(): Drawing {
  const px = new Pixels(16, 16);
  px.ellipse(7.5, 9.5, 6.2, 5, 'R').ellipse(7.5, 9.5, 4.8, 3.8, 'r');
  px.line(4, 8, 7, 9, 'p').line(8, 11, 11, 10, 'p').set(6, 11, 'p');
  px.rect(11, 2, 2, 5, 'w').ellipse(11, 2.5, 1.5, 1.2, 'w').ellipse(13, 2.5, 1.5, 1.2, 'w');
  px.outline('k');
  return { pixels: px, palette: {} };
}

export function mice(): Drawing {
  const px = new Pixels(16, 16);
  const mouse = (x: number, y: number) => {
    px.ellipse(x, y, 4.2, 2.8, 'i').ellipse(x + 4.6, y - 0.8, 2.4, 2, 'i');
    px.ellipse(x + 3.6, y - 2.6, 1.2, 1.2, 'p').set(x + 5, y - 1.5, 'k').set(x + 7, y - 0.5, 'p');
    px.line(x - 4, y, x - 7, y - 3, 'p');
  };
  mouse(6, 11);
  mouse(8, 4.5);
  px.outline('k');
  return { pixels: px, palette: {} };
}

export function hay(): Drawing {
  const px = new Pixels(16, 16);
  px.rect(2, 5, 12, 9, 'd');
  for (const x of [3, 6, 9, 12]) px.rect(x, 5, 1, 9, 'y');
  px.rect(5, 5, 1, 9, 'N').rect(10, 5, 1, 9, 'N').rect(2, 5, 12, 1, 'y');
  px.line(4, 5, 3, 2, 'y').line(8, 5, 8, 1, 'y').line(11, 5, 13, 2, 'y').line(1, 12, 0, 14, 'y').line(14, 12, 15, 14, 'y');
  px.outline('k');
  return { pixels: px, palette: {} };
}

export function rottingFruit(): Drawing {
  const px = new Pixels(16, 16);
  px.ellipse(8, 9.5, 5.4, 4.8, 'N').ellipse(6.5, 8, 1.8, 1.4, 'n');
  for (const [x, y] of [[9, 11], [11, 8], [6, 12]] as const) px.set(x, y, 'O');
  for (const [x, y] of [[8, 7], [10, 10], [5, 11]] as const) px.set(x, y, 'G');
  px.rect(8, 3, 1, 2, 'N');
  px.outline('k');
  for (const [x, y] of [[2, 3], [13, 4]] as const) px.set(x, y, 'k').set(x - 1, y - 1, 'w').set(x + 1, y - 1, 'w');
  return { pixels: px, palette: {} };
}
