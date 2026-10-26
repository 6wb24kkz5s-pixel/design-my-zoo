// The colours the sprites use. One shared palette keeps everything looking like one game.

import { FALLBACK_PAINT_STYLE, MATERIAL_STYLE, type Pattern } from '../config';
import { TRANSPARENT } from './pixels';

/** A palette: one character to one CSS colour. */
export type Palette = Readonly<Record<string, string>>;

/** The shared colours. Letters are easy to read in the sprite drawings. */
export const PALETTE: Palette = {
  k: '#1e2a30', // dark outline
  w: '#ffffff',
  l: '#f4f1de', // cream
  s: '#8a9aa3', // light slate
  t: '#5c6b73', // dark slate
  a: '#f08a2c', // orange
  b: '#c4621f', // dark orange
  y: '#ffd23f', // yellow
  Y: '#e0a100', // deep yellow
  r: '#e84a5f', // red
  R: '#a8323f', // dark red
  p: '#ff9db8', // pink
  P: '#d9648a', // dark pink
  g: '#74c44c', // green
  j: '#9be36b', // light green
  G: '#4f9a32', // dark green
  h: '#2f7d44', // forest green
  n: '#9a6b3f', // brown
  N: '#6b4826', // dark brown
  d: '#d8a24a', // tan
  e: '#f3df9a', // sand
  E: '#c9a85a', // dark sand
  u: '#3d9be9', // water blue
  U: '#1e6fb8', // dark blue
  v: '#bfe3ff', // light blue
  c: '#59c9b8', // teal
  C: '#2f8f83', // dark teal
  o: '#8b5a2b', // soil
  O: '#5b4330', // mud
  i: '#b0b0b0', // stone
  I: '#6e6e6e', // dark stone
  q: '#a79cc4', // lilac grey
  Q: '#7d72a0', // dark lilac grey
  f: '#d8cfb8', // dry floor
  F: '#9a8f73', // crack
  x: 'rgba(255, 224, 102, 0.55)', // sunlight
  X: 'rgba(255, 244, 180, 0.85)', // bright sunlight
  z: 'rgba(30, 42, 48, 0.3)', // shadow
};

/** The CSS colour for a pixel, or null if it is see-through. The sprite's own palette wins over the shared one. */
export function colourOf(pixel: string, own?: Palette): string | null {
  if (pixel === TRANSPARENT) return null;
  const colour = own?.[pixel] ?? PALETTE[pixel];
  if (colour === undefined) throw new Error(`unknown colour "${pixel}"`);
  return colour;
}

export function hexOf(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}

/** Mixes two #rrggbb colours: t = 0 gives a, t = 1 gives b. */
export function mixHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [ar, ag, ab] = parse(a) as [number, number, number];
  const [br, bg, bb] = parse(b) as [number, number, number];
  const channel = (from: number, to: number) => Math.round(from + (to - from) * t).toString(16).padStart(2, '0');
  return `#${channel(ar, br)}${channel(ag, bg)}${channel(ab, bb)}`;
}

/**
 * What a material looks like: its light, middle and dark colours, a pattern colour, and
 * the kind of pattern. The sprites for pools, huts, fences and so on use the letters
 * L, M, D and P, so one drawing can be made in any material.
 */
export interface MaterialLook {
  id: string;
  pattern: Pattern;
  palette: Palette;
}

export function materialLook(id: string): MaterialLook {
  const style = MATERIAL_STYLE[id] ?? FALLBACK_PAINT_STYLE;
  const base = hexOf(style.colour);
  return {
    id,
    pattern: style.pattern,
    palette: {
      L: mixHex(base, '#ffffff', 0.4),
      M: base,
      D: mixHex(base, '#000000', 0.28),
      P: hexOf(style.patternColour),
    },
  };
}
