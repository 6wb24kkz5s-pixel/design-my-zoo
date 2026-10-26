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

/** How strongly the grid lines show over the pictures (0 to 1). */
export const GRID_LINE_ALPHA = 0.45;

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
  /** Width of the side panel that slides in when an animal is tapped. */
  panelWidth: 330,
} as const;

/** The little faces that float above an animal when its hearts change, and the badge on a happy animal. */
export const EMOTE = {
  gain: '😊',
  lose: '😟',
  becameHappy: '🥰',
  /** How far an emote rises, in world pixels, and how long it takes to fade away. */
  rise: 34,
  ms: 1400,
  fontSize: 26,
  happyBadge: '❤️',
  badgeFontSize: 18,
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

/**
 * Placeholder animals: one neutral colour for all of them, so colour gives no
 * hint about how the animals are grouped. Real pictures come in M8.
 */
export const ANIMAL_STYLE = {
  colour: 0xfff1c9,
  border: 0x1e2a30,
  borderWidth: 3,
  /** Gap between an animal and the edge of its squares, in world pixels. */
  inset: 5,
  labelColour: '#1e2a30',
  /** The idle bob: how far an animal moves up, in world pixels, and how long one bob takes. */
  bobHeight: 3,
  bobMs: 900,
  /** Each animal starts its bob a little later than the last, so they never move in step. */
  bobStaggerMs: 170,
  bubbleFill: 0xffffff,
  bubbleBorder: 0x3d9be9,
  bubbleBorderWidth: 3,
  bubbleText: '#1e2a30',
  bubbleFontSize: 15,
  bubblePadX: 10,
  bubblePadY: 6,
  /** Gap between the bubble and the top of the animal, in world pixels. */
  bubbleGap: 8,
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
  /** Building-area squares with no ground painted yet: a plain, empty plot. */
  unpainted: 0xdcdfcc,
  gridLine: 0xb8bda6,
  path: 0xe2c98f,
  pathLine: 0xc9ac6c,
} as const;

/** Simple placeholder patterns, so colour is never the only clue (GDD section 15). */
export type Pattern = 'none' | 'dots' | 'bigDots' | 'stripes' | 'planks' | 'mesh' | 'shine' | 'leaves';

export interface PaintStyle {
  colour: number;
  pattern: Pattern;
  patternColour: number;
}

// Keyed by the ground ids in char-and-properties.json.
export const GROUND_STYLE: Readonly<Record<string, PaintStyle>> = {
  grass: { colour: 0x74c44c, pattern: 'none', patternColour: 0x4f9a32 },
  soil: { colour: 0x8b5a2b, pattern: 'none', patternColour: 0x6b4420 },
  sand: { colour: 0xf3df9a, pattern: 'dots', patternColour: 0xc9a85a },
  mud: { colour: 0x5b4330, pattern: 'stripes', patternColour: 0x3e2d20 },
  rocks: { colour: 0xa4a4a4, pattern: 'bigDots', patternColour: 0x6e6e6e },
  fallen_leaves: { colour: 0xd8a24a, pattern: 'leaves', patternColour: 0xa0521d },
};

// Keyed by the material ids in char-and-properties.json.
export const MATERIAL_STYLE: Readonly<Record<string, PaintStyle>> = {
  glass: { colour: 0xbfe8ff, pattern: 'shine', patternColour: 0xffffff },
  metal: { colour: 0x7d868c, pattern: 'none', patternColour: 0x5c6368 },
  metal_mesh: { colour: 0xa9b0b5, pattern: 'mesh', patternColour: 0x4f565b },
  wood: { colour: 0x9a6b3f, pattern: 'planks', patternColour: 0x6b4826 },
  concrete: { colour: 0xb4b4ac, pattern: 'dots', patternColour: 0x85857d },
  clear_plastic: { colour: 0xeef7f4, pattern: 'none', patternColour: 0xc4d9d2 },
  fabric: { colour: 0xd9739f, pattern: 'stripes', patternColour: 0xa94a74 },
  fabric_net: { colour: 0xe9b6cc, pattern: 'mesh', patternColour: 0xa94a74 },
};

export const FALLBACK_PAINT_STYLE: PaintStyle = { colour: 0x999999, pattern: 'none', patternColour: 0x666666 };

/**
 * What an unsuitable material looks like, by the property it is missing. These are
 * placeholder pictures until the Art milestone (M8). The properties come from the data file.
 */
export type ResultVisual = 'drain' | 'sink' | 'fall' | 'light';

export const RESULT_VISUAL: Readonly<Record<string, ResultVisual>> = {
  waterproof: 'drain',
  floats: 'sink',
  strong: 'fall',
  transparent: 'light',
};

/**
 * Which placeholder picture each feature gets. This is only about how things look, so it
 * is keyed by feature id (some jobs, like the hut and the swing, need the same property).
 */
export type ItemPicture = 'waterHolder' | 'island' | 'hut' | 'shade' | 'swing';

export const ITEM_PICTURE: Readonly<Record<string, ItemPicture>> = {
  deep_pool: 'waterHolder',
  shallow_pond: 'waterHolder',
  water_bowl: 'waterHolder',
  floating_island: 'island',
  hut: 'hut',
  shade_cover: 'shade',
  swing: 'swing',
};

export const RESULT_STYLE = {
  water: 0x3d9be9,
  waterLine: 0xbfe3ff,
  dry: 0xd8cfb8,
  crack: 0x9a8f73,
  sun: 0xffe066,
  sunAlpha: 0.55,
  shadow: 0x1e2a30,
  shadowAlpha: 0.28,
  /** Thickness of the rim around a pool, in world pixels. */
  rim: 9,
  /** How long the drain, sink and fall pictures take, in milliseconds. */
  animateMs: 1100,
  /** How far a working swing sways each way (degrees), and how long one sway takes. */
  swayDegrees: 7,
  swayMs: 900,
  /** The badge showing the property an unsuitable material is missing. */
  badgeRadius: 14,
  badgeFill: 0xffffff,
  badgeBorder: 0xff9f1c,
  badgeBorderWidth: 3,
  badgeFontSize: 16,
  /** Dashed outline round an item whose material does not suit it. */
  problemDash: 8,
  problemGap: 5,
} as const;

export const ROOF_STYLE = {
  /** How strongly a roof tints the enclosure below it. */
  tintAlpha: 0.4,
  hatch: 0xff9f1c,
  hatchAlpha: 0.9,
  hatchLineWidth: 2,
} as const;

export const ENCLOSURE = {
  /** Gaps up to this many squares wide are found and shown; wider openings just count as "not closed in". */
  maxGapWidth: 3,
} as const;

/** The enclosure check: gold outline when closed, amber dashed boxes on gaps. Both pulse gently. */
export const ENCLOSURE_STYLE = {
  glow: 0xffd23f,
  glowWidth: 6,
  gap: 0xff9f1c,
  gapFillAlpha: 0.45,
  gapLineWidth: 5,
  dash: 9,
  dashGap: 6,
  pulseMs: 700,
  pulseMinAlpha: 0.35,
} as const;

/** A touch counts as a tap (not a drag) if it moves less than this and lifts quickly. */
export const TAP = {
  maxMoveCss: 12,
  maxMs: 600,
} as const;

export const FENCE_DRAW = {
  /** Gap between a fence block and the edge of its square, in world pixels. */
  inset: 1,
  borderWidth: 3,
  border: 0x1e2a30,
  patternLineWidth: 2,
  /** A fence that is not strong has a dashed outline. */
  weakDash: 7,
  weakGap: 5,
} as const;
