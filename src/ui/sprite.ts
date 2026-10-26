import { spriteUrl } from '../art';

/** A picture from the game's art, for a button or panel. It is crisp, never blurred, and cannot be dragged away. */
export function spriteImg(name: string, className = 'sprite'): HTMLImageElement {
  const image = document.createElement('img');
  image.src = spriteUrl(name);
  image.alt = '';
  image.className = className;
  image.draggable = false;
  return image;
}
