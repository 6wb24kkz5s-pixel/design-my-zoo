import { bakeArt, type Art } from './atlas';

let current: Art | null = null;

/** Draws all the pictures. Call once, before the game starts. */
export function initArt(): Art {
  current ??= bakeArt();
  return current;
}

/** The pictures. Only available after initArt(). */
export function art(): Art {
  if (!current) throw new Error('initArt() has not been called yet');
  return current;
}

/** Shorthand for a picture as a data: address, for buttons and panels. */
export function spriteUrl(name: string): string {
  return art().url(name);
}
