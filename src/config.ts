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

/** Space kept around the grid when fitting it to the screen, in CSS pixels. */
export const SCREEN_MARGIN = 16;

/** Highest device pixel ratio we render at (iPads are 2). Caps GPU work on 3× screens. */
export const MAX_PIXEL_RATIO = 2;

export const CAMERA = {
  /** At most zoomed in, about this many squares fill the screen height (GDD section 6). */
  minVisibleRows: 6,
  /** Each tap of + or – zooms in or out by this factor. */
  buttonZoomStep: 1.5,
  /** Length of the + / – / "See whole zoo" animation, in milliseconds. */
  tweenMs: 250,
} as const;

/** Sizes of the HTML overlay, in CSS pixels. Passed to the CSS as variables. */
export const UI = {
  topBarHeight: 64,
  zoomButtonSize: 64,
} as const;

// Placeholder colours until the Art milestone (M8).
export const COLOURS = {
  background: 0x2f3e46,
  grass: 0x9bd770,
  gridLine: 0x6fae4a,
  path: 0xe2c98f,
  pathLine: 0xc9ac6c,
} as const;
