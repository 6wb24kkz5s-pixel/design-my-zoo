// Grid size and placeholder colours. Keep all layout numbers here.

export const GRID = {
  cols: 32,
  rows: 24,
  /** Size of one square at 100% zoom, in pixels. */
  squareSize: 48,
  /** Width of the visitor path around the edge, in squares (GDD section 6). */
  pathWidth: 1,
  /** Thickness of the grid lines between squares, in pixels. */
  lineWidth: 1,
} as const;

/** Space kept around the grid when fitting it to the screen, in pixels. */
export const SCREEN_MARGIN = 16;

// Placeholder colours until the Art milestone (M8).
export const COLOURS = {
  background: 0x2f3e46,
  grass: 0x9bd770,
  gridLine: 0x6fae4a,
  path: 0xe2c98f,
  pathLine: 0xc9ac6c,
} as const;
