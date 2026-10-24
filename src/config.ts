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
  paletteHeight: 168,
} as const;

/** How many actions Undo remembers (GDD section 7). */
export const UNDO_LIMIT = 20;

/** localStorage key for the autosaved zoo. Bump the version if the save format changes. */
export const SAVE_KEY = 'design-my-zoo:zoo:v1';

// Placeholder item colours, one per palette tab, until the Art milestone (M8).
export const TAB_COLOURS: Readonly<Record<string, number>> = {
  water: 0x3d9be9,
  plants: 0x2f7d44,
  shelter: 0x9a6b3f,
  food: 0xe8833a,
};

export const ITEM_STYLE = {
  fallbackColour: 0x888888,
  border: 0x1e2a30,
  borderWidth: 2,
  /** Gap between an item and the edge of its squares, in world pixels. */
  inset: 3,
  /** Opacity of an item while it is being moved somewhere else. */
  movingAlpha: 0.35,
  labelSize: 11,
  labelColour: '#ffffff',
  labelStroke: '#1e2a30',
} as const;

/** The outline shown while dragging: green and solid if it fits, grey and dashed if not. */
export const GHOST_STYLE = {
  fits: 0x3fd34f,
  noFit: 0x8a8a8a,
  fillAlpha: 0.35,
  lineWidth: 4,
  dash: 10,
  gap: 7,
} as const;

// Placeholder colours until the Art milestone (M8).
export const COLOURS = {
  background: 0x2f3e46,
  grass: 0x9bd770,
  gridLine: 0x6fae4a,
  path: 0xe2c98f,
  pathLine: 0xc9ac6c,
} as const;
