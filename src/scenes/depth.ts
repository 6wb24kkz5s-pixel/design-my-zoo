/** Drawing order of the plot's layers, bottom to top. */
export const DEPTH = {
  base: 0,
  ground: 1,
  gridLines: 2,
  fences: 3,
  items: 4,
  animals: 5,
  enclosure: 6,
  ghost: 7,
} as const;
