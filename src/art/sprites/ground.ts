import { FALLBACK_PAINT_STYLE, GROUND_STYLE } from '../../config';
import { hexOf, mixHex, type Palette } from '../palette';
import { Pixels, seededRandom } from '../pixels';

const TILE = 16;

export interface Drawing {
  pixels: Pixels;
  palette: Palette;
}

/** The three colours of a ground type: its own, a darker one and a lighter one. */
function groundPalette(id: string): Palette {
  const base = hexOf((GROUND_STYLE[id] ?? FALLBACK_PAINT_STYLE).colour);
  return { '1': base, '2': mixHex(base, '#000000', 0.22), '3': mixHex(base, '#ffffff', 0.28), '4': mixHex(base, '#000000', 0.4) };
}

/** One 16×16 tile of a ground type. `variant` makes a second look so a big patch is not obviously tiled. */
export function groundTile(id: string, variant: number): Drawing {
  const px = new Pixels(TILE, TILE);
  px.rect(0, 0, TILE, TILE, '1');
  const random = seededRandom(1000 + variant * 77 + id.length * 13 + id.charCodeAt(0));

  switch (id) {
    case 'grass': {
      // Little "v" tufts of darker and lighter grass.
      for (let i = 0; i < 9; i++) {
        const x = 1 + Math.floor(random() * 13);
        const y = 2 + Math.floor(random() * 12);
        const c = random() < 0.6 ? '2' : '3';
        px.set(x, y, c).set(x - 1, y - 1, c).set(x + 1, y - 1, c);
      }
      break;
    }
    case 'soil': {
      for (let i = 0; i < 26; i++) px.set(Math.floor(random() * TILE), Math.floor(random() * TILE), random() < 0.6 ? '2' : '3');
      for (let i = 0; i < 4; i++) px.rect(Math.floor(random() * 13), Math.floor(random() * 14), 2, 1, '4');
      break;
    }
    case 'sand': {
      for (let i = 0; i < 22; i++) px.set(Math.floor(random() * TILE), Math.floor(random() * TILE), random() < 0.7 ? '2' : '3');
      // A ripple or two.
      const y = 4 + Math.floor(random() * 8);
      px.line(2, y, 6, y, '2').line(7, y + 1, 12, y + 1, '2');
      break;
    }
    case 'mud': {
      for (let i = 0; i < 5; i++) px.ellipse(2 + random() * 12, 2 + random() * 12, 2.4, 1.6, '2');
      for (let i = 0; i < 10; i++) px.set(Math.floor(random() * TILE), Math.floor(random() * TILE), '3');
      break;
    }
    case 'rocks': {
      for (let i = 0; i < 3; i++) {
        const cx = 3 + random() * 10;
        const cy = 3 + random() * 10;
        px.ellipse(cx, cy, 3.2, 2.5, '4');
        px.ellipse(cx, cy - 0.3, 2.6, 2, '1');
        px.ellipse(cx - 0.7, cy - 1, 1.2, 0.8, '3');
      }
      break;
    }
    case 'fallen_leaves': {
      const colours = ['2', '4', '3'] as const;
      for (let i = 0; i < 7; i++) {
        const cx = 2 + random() * 12;
        const cy = 2 + random() * 12;
        const c = colours[i % 3] as string;
        px.ellipse(cx, cy, 2.2, 1.2, c);
        px.set(cx - 1, cy, '4');
      }
      break;
    }
    default:
      for (let i = 0; i < 16; i++) px.set(Math.floor(random() * TILE), Math.floor(random() * TILE), '2');
  }
  return { pixels: px, palette: groundPalette(id) };
}

/** The plain, unpainted building area: a pale tile with a few specks. */
export function plotTile(): Drawing {
  const px = new Pixels(TILE, TILE);
  px.rect(0, 0, TILE, TILE, '1');
  const random = seededRandom(4242);
  for (let i = 0; i < 12; i++) px.set(Math.floor(random() * TILE), Math.floor(random() * TILE), random() < 0.5 ? '2' : '3');
  return { pixels: px, palette: { '1': '#dcdfcc', '2': '#cfd3bd', '3': '#e9ecdb' } };
}

/** The sandy visitor path round the edge, with a few pebbles. */
export function pathTile(): Drawing {
  const px = new Pixels(TILE, TILE);
  px.rect(0, 0, TILE, TILE, '1');
  const random = seededRandom(777);
  for (let i = 0; i < 14; i++) px.set(Math.floor(random() * TILE), Math.floor(random() * TILE), random() < 0.6 ? '2' : '3');
  for (let i = 0; i < 3; i++) px.ellipse(2 + random() * 12, 2 + random() * 12, 1.4, 1, '4');
  return { pixels: px, palette: { '1': '#e2c98f', '2': '#d3b87a', '3': '#efdba8', '4': '#b99c5e' } };
}
