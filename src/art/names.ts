/** The names of the pictures in the art atlas. Everything that draws a sprite asks for it by name. */
export const spriteName = {
  ground: (id: string, variant: number) => `ground:${id}:${variant}`,
  plot: 'tile:plot',
  path: 'tile:path',
  /** A small picture of a material, for the material cards. */
  material: (id: string) => `material:${id}`,
  fence: (material: string, weak = false) => (weak ? `fence:${material}:weak` : `fence:${material}`),
  roof: (material: string) => `roof:${material}`,
  roofHatch: 'roof:hatch',
  animal: (id: string) => `animal:${id}`,
  /** The second picture of an animal that swims or flaps (its tail swished or its wings raised). */
  animalPose: (id: string) => `animal:${id}:b`,
  /** A placed feature or food. Features with a material choice have one picture per material. */
  item: (id: string, material?: string) => (material ? `item:${id}:${material}` : `item:${id}`),
  /** The water that fills a pool, pond or bowl, and the cracks in it once it has drained. */
  water: (featureId: string) => `part:water:${featureId}`,
  cracks: (featureId: string) => `part:cracks:${featureId}`,
  ripple: 'part:ripple',
  rubble: (material: string) => `part:rubble:${material}`,
  shadow: 'part:shadow',
  sun: 'part:sun',
  swingBroken: (material: string) => `part:swing-broken:${material}`,
  /** The outlined, easy-to-see version of a picture, used when the plot is zoomed out. */
  icon: (name: string) => `icon:${name}`,
} as const;

/** How many ground variations there are for each ground type. */
export const GROUND_VARIANTS = 2;
