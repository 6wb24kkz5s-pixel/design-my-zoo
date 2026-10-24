import { MAX_PIXEL_RATIO } from './config';

/** Game pixels per CSS pixel. 2 on iPad, so the game draws at full Retina sharpness. */
export const PIXEL_RATIO = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
