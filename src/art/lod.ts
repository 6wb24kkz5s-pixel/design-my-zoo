// "Level of detail": when the plot is zoomed out, a 16-pixel picture is only a few screen pixels
// wide. Pictures are then drawn bigger, with a pale halo, so they still read as clear icons.

export const ICON = {
  /** Aim for at least this many screen pixels (CSS pixels) across the smaller side of a picture. */
  minScreenPx: 26,
  /** Never draw a picture more than this many times bigger than its square. */
  maxScale: 2.4,
  /** Below this scale the normal picture is used, since it is nearly full size already. */
  switchAbove: 1.08,
} as const;

/**
 * How much bigger to draw a picture so it is clear on screen.
 * `squarePx` is the width of one grid square on screen; `smallestSide` is the picture's smaller side, in squares.
 */
export function iconScale(squarePx: number, smallestSide: number): number {
  const wanted = ICON.minScreenPx / (squarePx * smallestSide);
  return Math.min(Math.max(wanted, 1), ICON.maxScale);
}

/** True if the outlined icon picture should be used. */
export function usesIcon(scale: number): boolean {
  return scale > ICON.switchAbove;
}

/** Animal names show only once the plot is zoomed in this far (screen pixels per square). */
export const NAME_TAG_MIN_SQUARE_PX = 38;
